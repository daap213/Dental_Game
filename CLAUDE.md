# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project uses **pnpm** (pinned via `packageManager` in `package.json`). Do not use npm or yarn — it would create a competing lockfile.

```bash
pnpm install
pnpm dev           # Vite dev server on port 3000, host 0.0.0.0
pnpm build         # typecheck, then production build to dist/
pnpm preview       # Serve the built bundle
pnpm typecheck     # tsc --noEmit for both tsconfig.json and tsconfig.node.json
pnpm lint          # eslint . (0 errors expected; warnings are tracked debt)
pnpm test          # vitest run
pnpm test:watch    # vitest
pnpm format        # prettier --write .
```

Run a single test file with `pnpm vitest run src/game/perks.test.ts`, or a single case with `-t "substring del nombre"`.

**Don't run `pnpm format` to tidy a change.** The repo is *not* prettier-clean, so `prettier --write .` rewrites over a hundred files it has nothing to do with, and the change you meant to make disappears into the noise. Format only what you touched — `pnpm prettier --write <paths>` — and even then look at the diff: files like `GameCanvas.tsx` and `game/weapons.ts` are written in a deliberately dense one-statement-per-line style that prettier triples in length. Match the surrounding code instead.

Install-script approvals live in `pnpm-workspace.yaml` under `allowBuilds` (pnpm 11 moved these out of `package.json`). Only `esbuild` is allowed — it needs its postinstall to link the native binary Vite uses.

**No environment variables, and that is now load-bearing.** The game makes **zero outbound network requests** — nothing is fetched, no CDN, no analytics, no API. This used to be false: a Gemini integration wrote the mission briefing and the death diagnosis, with the API key inlined into the public bundle by a `define` in `vite.config.ts`. It was removed, and the published privacy policy now asserts that nothing leaves the browser. Adding any outbound call breaks a legal claim, not just a build rule — see `src/i18n/legal/`.

## Migration in progress

This repo is mid-migration under `C:\Users\user\.claude\plans\compiled-sparking-spindle.md`. Done: pnpm + tooling, balance data extracted to `src/game/data/`, typed i18n, rendering split out of the simulation, a typed `World`, and the engine decoupled from React. Next: the rewrite onto **Phaser 4**, with React kept only as the UI shell.

`src/components/GameCanvas.tsx` still owns the loop, input, physics and camera, and is scheduled for **replacement rather than repair** — Phaser supplies all four. Do not grow it: new simulation logic goes in `src/game/`, new tuning numbers in `src/game/data/`, new drawing in `src/game/render/`. `git tag pre-phaser` marks the last pre-migration commit.

A gameplay audit has since been applied on top; every fix it needed was pulled _out_ of the monolith into `src/game/` (`triggers.ts`, `progression.ts`, `fallIntoPit`, `findRespawn`, `cullEnemies`, `syncHud`) rather than added to it, and each one carries tests. The behaviours worth knowing before touching the loop: fixed timestep, hold-to-fire governed by `getFireCooldown`, the damage multiplier applied at spawn, and `Escape` only toggling `PLAYING`↔`PAUSED`.

## Architecture

A single-page React app. The game lives in `src/game/`, in layers that only depend downward: `data/` (pure tuning tables) ← `game/` (simulation) and `render/` (Canvas 2D drawing). Neither layer imports React. `src/components/GameCanvas.tsx` is the shell that owns the loop and input and bridges the two worlds.

### State ownership

- **`src/App.tsx`** owns the `GameState` enum machine (`src/types.ts`) and the run configuration: language, difficulty, character, loadout, input method. Every view (`MainMenu`, `PauseMenu`, `PerkMenu`, `GameOver`, `Credits`) is an absolutely-positioned overlay — `GameCanvas` stays mounted the whole time.
- Restarting is `setSessionId(s => s + 1)`; `GameCanvas` watches `sessionId` and calls `resetGame()`.
- **`src/game/world.ts`** defines `World` — the whole mutable simulation state — and `createWorld(config)` which builds it (including the player, via `src/game/player.ts`). `GameCanvas` holds one in a `useRef` and mutates it in place; restarting is `entities.current = createWorld(runConfig)`.
- **The engine never calls React.** `World` carries two outbound channels instead: `world.hud` (continuous values the HUD shows) and `world.events` (one-shots: `perk-offer`, `victory`, …). The rAF loop drains the queue and publishes the HUD snapshot **once per frame**, skipping `setState` when `hudChanged()` reports nothing moved. Adding a HUD value means extending `HudSnapshot`, `syncHud` and `hudChanged`, not adding a `useState`.
- **`GameHUD` only ever sees `HudSnapshot`.** It used to also receive the mutable `Player` and read shield, lives, weapon and multipliers straight off it, which meant those only refreshed when something else in the snapshot changed. Everything the HUD draws must go through the snapshot; `syncHud(world)` copies the player-derived half of it in one place.
- **The published snapshot must be a copy — `snapshotHud(world)`, never `world.hud`.** The loop keeps the last thing React saw so `hudChanged` can compare against it. Holding the reference instead of a copy means comparing the object with itself: it always reports "nothing moved", `setHud` is never called, and the whole HUD freezes on the values it had when the run started while the engine happily writes correct ones. That shipped once; `world.test.ts` pins it.

### Game loop

- `requestAnimationFrame` loop in a `useEffect` keyed on `gameState`. It runs during `PLAYING` **and** `PERK_SELECTION`, but only steps the simulation when `PLAYING` — during perk selection it keeps drawing so the frozen frame shows behind the perk cards.
- **Fixed timestep.** `planSteps` (`src/game/loop.ts`) decides how much simulation a frame gets: the loop accumulates real elapsed time and spends it in `FIXED_STEP` (1/60s) chunks, so `update()` always receives the same `dt`. The time entering one frame is capped at `MAX_STEPS_PER_FRAME` steps (33ms) and any excess is **dropped, never chased** — the game may run slow on a machine that can't keep up, but it never fast-forwards. Raising that cap brings back the "everything suddenly sped up" feel after any browser hitch. The stepping loop also breaks as soon as `world.events` is non-empty, so a perk offer freezes the game on the frame it happens instead of simulating past it.
- **Mixed time base, now safe:** positions integrate per _step_ (`p.x += p.vx`, `p.vy += GRAVITY`) while timers and cooldowns are `dt`-scaled, and the weapon cooldown `p.frameTimer` decrements by 1 per step. Both conventions coexist because a step always represents 1/60s — this is what the fixed timestep buys. Preserve whichever convention the surrounding code uses, and do **not** reintroduce `Date.now()` into the simulation (rendering may use it freely).
- `syncHud(world)` runs once per frame in the loop, right before the `hudChanged` check, so it also refreshes while the game is frozen picking a perk.
- The loop stops rescheduling itself when `hp <= 0 && lives <= 0`, which is what triggers `handleGameOver`. It publishes the score and switches to `GAME_OVER` in one call; `GameOver` derives the villain's diagnosis from the score itself (`game/gameover.ts`). It used to be split into two `onGameOver` calls because the diagnosis came from an API and arrived late — the first call existed only so the score would not lag a run behind.

### `src/game/` modules mutate arguments; they are not pure transforms

`spawnProjectile(world.projectiles, …)`, `spawnEnemy(level, cameraX, enemies)` and `updateEnemyAI(enemy, player, world, audio)` receive what they must mutate and push into it. Same for `fallIntoPit(player, platforms)` and `advanceTriggers(state, dt, …)`. The boss spawners take the whole `World` and write to `world.hud`; they no longer receive React setters.

The exceptions that _do_ return a new value are the filters: `cullEnemies(enemies, cameraX)` returns the survivors, mirroring the existing `projectiles.filter(…)` style in the loop.

### Perk flow (crosses the React boundary both ways)

`update()` detects a score/kill milestone or a boss kill → `getRandomPerks` → `onPerkSelectStart` → `App` switches to `PERK_SELECTION` → `PerkMenu` → the chosen id comes back down as the `selectedPerkId` prop → a `GameCanvas` effect calls `applyPerk` on the player ref, force-clears every input flag (anti-stuck-key), then `onPerkApplied` returns to `PLAYING`. `update()` `return`s early on a milestone, skipping the rest of that frame.

### Level, camera, collision

- Fixed 800×450 backing store (`src/game/data/physics.ts`), CSS-scaled with `object-contain`; mouse coordinates are rescaled through `getBoundingClientRect`.
- `generateLevel(width)` builds a procedural platform array. `levelWidth` starts at 8000 and grows +2000 per stage. The last 800px is the boss arena: once `bossSpawned` the camera locks there and the player's x is clamped into it. Clearing stage 5 fires `onVictory` → `Credits`.
- Platforms are solid from all sides (not one-way). Collision is axis-separated: `checkPlatformCollisions` is called once after the x integration and again after the y integration, using the AABB test in `src/game/physics.ts`.

### Rendering

All drawing lives in `src/game/render/` and nothing outside it draws. There are no image assets — every sprite, enemy, background and transition is Canvas 2D code. `render/scene.ts` composes a frame (background → camera-translated world → screen-space transition); the rest are leaf modules per subject. These are pure `ctx` calls with no state, which is exactly what lets the Phaser port re-run them **once** into baked textures instead of every frame.

**The background is a declared stack** (`render/background/`), not a function with four `blit` calls and its parallax factors written inline. Each layer declares its depth and how it bakes itself from the stage's scene, so adding a layer is adding an entry. Three rules the stack keeps, each with a test in `background/stack.test.ts`:

- **Draw order comes from the stack, never from the data.** `scene.layers` says _which_ layers take part; the order is always `LAYERS`. A mistyped list would otherwise put the throat in front of the gums, and that mistake is invisible in review.
- **Tiling layers are indexed by world column, not screen position.** That is what keeps column 37 the same tooth as the camera passes; a screen index would make the arcade boil.
- `anchor: 'screen'` marks a layer that _frames_ the scene instead of living in it (the foreground gums). Those have parallax 0 even though they draw in front of everything, so they sit outside the depth ordering.

Variation comes from `render/noise.ts` — a deterministic hash, never `Math.random()`. Baked art with a random seed is frozen with whatever it rolled that session, so two runs of the same stage would not share a scenery. That shipped once in the credits scene.

Two traps worth knowing before drawing anything new:

- **A rectangle one pixel wide is useless for dithering.** The 4×4 matrix is anchored to absolute coordinates, so a narrow strip only touches one of its four phases: at low levels some columns come out dotted and their neighbours empty. A horizontal gradient built from 1px columns reads as a grid of vertical stripes. Step in fours, or evaluate the threshold per pixel (`background/cheeks.ts` does the latter).
- **A thin, long detail does not read as relief — it reads as a scratch.** It needs thickness with two faces (light above, shadow below) and short runs. `ditherOver` is the primitive for anything that goes _on top_ of another layer: unlike `dither`/`ditherFill` it does not paint the base tone, so it dirties without covering.

**The frame is alive, and its life lives in `mouth.live`, not in `props`.** Everything that happens _in front_ of the teeth belongs to the frame layer: the breath pulse on the flesh, the wet sheen drifting along both arcades, the glints and bubbles on the baked saliva pool at the lower biting edge, and the foam in the commissures. `props` is drawn behind the frame on purpose, so anything put there that should read as being on a tooth ends up hidden. Two rules:

- **The breath pulse must never reach the play band** (y=210..330). It dims the flesh, and reaching the play area would dim the player twice per cycle — a fault no screenshot catches, since you have to wait for mid-cycle to see it. `breathBands(opening)` is exported purely so `mouth.test.ts` can pin it.
- **Half the frame's life is gated on `scene.saliva`** (pool, foam, bubbles, strands, bridges). A stage at zero goes dry with nothing failing, so `mouth.test.ts` also pins that every in-mouth stage has some.

The strand that **bridges both arcades** is the one saliva shape that reads differently from the rest — it joins instead of hanging — and it belongs in `props`, behind the frame, precisely so the teeth hide both of its ends, which is where it is stuck. It is also the only live detail that costs hundreds of `fillRect`s, so it is spaced to every other column: three at once and none of them reads.

**The instruments in frame are a catalogue** (`render/background/tools.ts`), not hand-placed pieces: six instruments, each declaring its silhouette _and how it moves_, and the stage picks which enter and from which side. Four rules the placement keeps, three of them from mistakes that shipped:

- **The canvas has the tip on the LEFT and the grip exiting right.** A tool entering from the left screen edge must be blitted flipped, anchored by its tip. Placing the canvas at the edge unflipped shows only the grip, with the tip 150px off-screen.
- **`props` draws _before_ `mouth`, so the arcade occludes the instruments.** Seen from inside a mouth, everything between the player and the outside world is opaque tissue: an instrument can only show _through the opening_, with the teeth cutting its shaft. Drawn after the frame it was painted on top of the gums — an instrument embedded in flesh, which is what shipped first. Behind the frame the occlusion is free; nothing needs clipping. Both `tools.test.ts` and `stack.test.ts` pin the order, and `data/stages.ts` lists the layers in that same order.
- **`ToolEntry.lane` is a fraction of the _opening_, not of the screen** (0 = upper gum line, 1 = lower), and it must land in the band the arcade leaves free — a tooth height in from each edge. Measured against the screen instead, the first version pushed the tools above the arcade to keep a steel shaft out of the platform band, which is exactly how they ended up inside the flesh. The platform band and the opening largely coincide; that is the geometry, and the answer is occlusion plus tilt, not moving the tool out of the mouth.
- **A dead-horizontal tool is a pipe, not an instrument.** Tilts here are baked as axis slopes and the `probe` motion drifts between two of them, so the shaft always reads as angled steel. This is a rule about the **background instruments**, which are long thin shafts where a slope is both cheaper and cleaner than a rotation — it is not a ban on rotation in general. Weapons do rotate their masks; see _Aim is one quantised step_.
- **The clinic stage deliberately has no entering instruments.** There we are already outside the mouth; its instruments are the three hanging off the unit, drawn _live_ from `props.ts` so they sway. Baked, they were the one still thing in a room where nothing else moves.

The operating theatre also carries the depth pass in `clinic.ts` (`drawRoomBase` before the furniture, `drawRoomDepth` after). Order matters both ways: a grime veil stamped last dims the chair and the unit along with the wall, and a wall shadow drawn as an offset rectangle dirties the very object it is meant to detach — it has to be the L-shape that only covers what sticks out. Without cast shadows and a vignette the room had plenty of furniture but every piece sat at the same value, which reads as a technical drawing rather than a place.

**The player is drawn larger than its hitbox, and that anchoring is the part that breaks in silence.** The sprite is 34×38 (`BODY_W`/`BODY_H` in `sprites/masks/player.ts`) over an unchanged 32×32 `PLAYER_SIZE`, anchored by the feet through `SpriteDef.offsetX/offsetY`. Four rules, each pinned by `sprites/player.test.ts`:

- **`offsetY = PLAYER_SIZE - h`**, so the last drawn row is the bottom of the hitbox. Lose it and the character floats above the floor or sinks into it — which in a screenshot is indistinguishable from a style choice.
- **The width difference must stay even** and `offsetX` exactly half of it. `blit` mirrors inside the destination rect, so an odd difference puts the mirror axis half a pixel off the hitbox centre and the character jumps sideways every time it turns around.
- **What sticks out above the hitbox must be few rows and narrow.** Platforms are drawn _before_ the player and are solid from below, so bonking a 20px plank paints the overhang on top of it. That is why every crown tapers at the top (`shoulder`, and the incisor's six-row bevel) and why 38 was chosen over 44.
- **Three consumers assume the sprite's size** and all three fail quietly: `render/player.ts` (the shield must ring the _drawing_, or the crown pokes outside the barrier; the ground shadow must stay at the _feet_ width, not the drawing's), `render/preview.ts` (draw at `-offsetX/-offsetY` or the card clips the crown), and `render/credits.ts` (the hero is inside `scale(3,3)`, so the offsets count triple and the feet leave the horizon).

**The arm is a separate sprite, not part of the body silhouette.** Inside it, every pose would need a lowered, a raised and a recoiling variant, and 32 sprites become nearly a hundred. Outside, they are three shared by the four classes. Its own outline where it overlaps the torso is correct in pixel art — a limb reads better with the edge marked — and its **wrist notch** is what stops the fist reading as a snout. The hand anchor comes _with the drawing_ (`ARM_HAND` + `armPlacement`); it used to be `p.x + 18 / +14, p.y + 19` written into `render/weapons.ts`, which knew nothing about the sprite, so moving the fist left the weapon floating with nothing to warn you. A test pins that the anchor lands on a **fill** tone of the fist, not its outline.

**Class must read in four features at once** — top edge, crown width, crown/leg proportion, and leg thickness and stance. Every class keeps two roots (a one-rooted incisor cannot walk), so root count cannot carry it, and the old test compared rows with a `Set`, which passed on a one-pixel difference. `player.test.ts` now measures the symmetric difference of the filled-pixel sets, both over the whole silhouette and over the top rows alone.

**Poses and their clocks.** `PlayerPose` is eight values: `idle`, a real four-frame walk, `rise`/`fall` split from `p.vy`, and `hurt`. `walkPhase` stays two-phase because **it belongs to the enemies**; the player uses `walkFrame` with its own `PLAYER_WALK_FPS = 14`, because at 7.5px per step the enemies' 8fps makes a 200px stride and the legs skate. Expression is carried by the eyes alone, and what reads at this size is the eye's **height**, not the pupil's position.

### Weapons and projectiles

**What a projectile does is data, not a string check.** `game/data/projectiles.ts` is a `Record<ProjectileType, ProjectileBehaviour>`: pierce, anchor, gravity, wobble, homing, sweep, contact and burst. It replaced three scattered checks inside `GameCanvas.tsx` — a `Set` of piercing types, an `if` for the player-anchored ones, an `if` for the falling ones — none of them type-linked. Adding a class and forgetting one was silent: a melee swing missing its `Set` entry flew off like a bullet and vanished on first hit. The step itself is `game/projectiles.ts`, which mirrors `cullEnemies`: it mutates what it gets and returns the survivors.

Three things about that loop that are load-bearing:

- **Melee is a player-anchored, piercing, short-lived hitbox** — it always was, nobody called it that. `vx/vy` on those projectiles is a _unit aim vector_, never velocity, and the box is re-placed on the player every step. `swept()` rotates a _local_ copy and never writes back — `vx/vy` stay the original aim, which is what the damage and the hit registry are reasoned about, and `weapons.test.ts` pins that the vector stays unit-length. The **drawing** follows the swept direction instead, through `proj.aimStep`, which is recomputed every step: that is what makes the tool turn as it sweeps rather than orbit with a frozen bitmap.
- **A sweep needs the geometry, not just the rotation.** The brush's box was a 200px square anchored 20px out: rotating it moved the centre 40px and the box already covered everything within 100px, so the arc was invisible. Melee boxes are now **radial** (thin, the edge's thickness) × **tangential** (long, the edge's length), with the stand-off derived from the blade's own length. The trade is real and no pinned number moves: single-target dps is unchanged while area coverage drops ~8×, so `projectiles.test.ts` pins a coverage invariant — the blade tip must not travel further per step than the blade is long, or enemies sit in the gaps.
- **The sweep is mirrored by `facing`.** Rotating `(1,0)` by a positive angle goes _down_ the screen and `(-1,0)` goes _up_, so without the mirror the same button gave an uppercut facing right and an overhead chop facing left.

**Adding a weapon**: five places are compile errors (`COOLDOWN_FRAMES`, `HELD_WEAPONS`, the typed dictionary in `en.ts` _and_ `es.ts`, `weaponLevels`, `EMBLEM_COLORS`) and the six that used to be silent are now exhaustive or derived — `getWeaponStats` has no `default`, `spawnProjectile` ends in a `never`, `playWeaponSound` too, and the menu, the HUD and the gallery all read `WEAPONS` from `data/weapons.ts` instead of a hand-written list. **`POWERUP_EMBLEMS` is the one to watch**: it is `satisfies Record<'health' | WeaponType, …>` now, but a missing entry there used to fall back to the bullet emblem in silence.

Two things that bit and are pinned:

- **`applyEnemyDamage(enemy, damage, fromX)` wants the origin of the attack, not the geometry of the hitbox.** It got `proj.x` — the box's _left edge_ — so a right-aimed wide swing reported an origin 80px to the player's left and hitting a `calculus_shell` in the back read as hitting its armoured front. The deity's level-wide floor beam had it for every shell on the map.
- **The drop table's health share is fixed at 25%.** It used to be a ladder of hand-written thresholds where health kept the remainder, so adding two weapons would have quietly dropped it to 12.5% — a game-wide sustain nerf that moves no other number.

**A melee effect must be drawn as the tool, not as an arc.** The three swings started life as generic shapes — a symmetric lens for the whip, a cut-down ring for the brush and the scythe — and the result was that clicking to attack showed nothing recognisable: the whip read as a leaf, the brush as a blade, the scythe as a hoop. They are now `lash`, `brushHead` and `reapBlade`, each drawing the actual implement: the whip **curves, thins and frays at the tip**; the brush is a **plastic back with uneven bristle tufts** along the leading edge; the scythe **tapers from a wide base to a hooked point** with a bright inner edge. It is more code than three calls to `annulus` and much less elegant, and it is the only thing that makes them readable. The same reasoning sets `BOW.w/h`: at 14×4 an arrow cannot have a head, a shaft and fletching, so it was a dash.

**The art has two invariants that nothing else catches**, both from defects that shipped:

- **Every `ProjectileType` must draw differently.** `projectileArt` ends in a `default` that returns a bullet ellipse, so `arrow` and `reap` — added to the type _and_ to the behaviour table but not to the art — silently drew as bullets: the arrow was a dash and the game's heaviest swing a round blob. It compiled and every test passed. `projectiles.test.ts` now compares the masks pairwise.
- **A mask uses only `#` and `.`; letters belong to the detail layer.** `shadeMask` treats any non-`.` character as filled, so a stray letter in a mask still _shades_ — it just draws a different silhouette than the one written, with nothing to warn you. A global find-and-replace put wood letters into three masks and two weapons lost their bodies. Conversely a letter in the _detail_ layer that isn't in the colour map paints `MISSING_COLOR` magenta; the blaster's crimped tail shipped that way. `render/weapons.test.ts` pins both, plus `validateSprite` over all eight held masks in every baked inclination.

### Aim is one quantised step, and it lives in `data/`

Weapons, their effects and the arm all orient from a **single** number: `aimStep`, one of sixteen 22.5° steps (`data/aim.ts`). It is in `data/` and not `render/` because the simulation needs it too — `orientedBox` gives the hitbox — and `game/` and `render/` may only depend downward.

Four rules the mechanism keeps, and all four exist because the thing they forbid shipped:

- **The bake id carries everything that changes the pixels.** `bake` keys on the id string and nothing else, so an id that omits the orientation makes four directions share one canvas: the first direction you swing is the picture you see for all four. The rotations were computed and thrown away, and no test could see it because they all read the memo, which _did_ distinguish. `orientation.test.ts` now pins _same id ⇒ same rows_. The mirror flip deliberately stays **out** of the id — `blit` does it while painting, so including it would double the bakes for nothing.
- **The drawing and the hitbox come from the same call.** Both go through `orientedBox(long, thick, step, frame)`. When they were derived separately, a vertical brush drew 24×56 over a 56×24 box — the art 90° off what it damaged.
- **Only the mask is rotated; shading comes after.** `shadeMask` derives the selective outline and the top-left light from the silhouette, so rotating first keeps the light consistent with every other sprite. Rotating shaded pixels takes the light with them.
- **Resampling pulls, never pushes.** For each destination pixel ask where it reads from (`resample` in `masks/shapes.ts`). A rotation is an isometry between lattices of the same pitch, so nothing two pixels thick can come out holed, and a one-pixel line survives as an 8-connected staircase. Pushing into the destination is what leaves rounding gaps along a diagonal. Supersampling with a majority vote is worse than either: a rotated 1px line covers about a third of the samples, so requiring half **erases** it — the bow's string, the brush's guard, the whip's core.

Two consequences worth knowing before touching it. Multiples of 90° short-circuit to `rotate90` composition, so the four axes stay pixel-exact and **the directions people already played in cannot change appearance**. And only the nine steps with a non-negative cosine are baked; the other seven are those mirrored, which is free and halves the memory.

`data/projectiles.ts` decides _whether_ a type orients, with `blade: 'along' | 'across' | null`. `'across'` is for sweeps, whose long side is tangential so the tool crosses in front instead of flying out. `null` defaults, on purpose: orienting grows the diagonal hitbox, so a forgotten type behaves as it always did rather than quietly gaining reach. That decision is not derivable from the art — a mortar is asymmetric yet deliberately keeps its tail skyward because it arcs — so `orientation.test.ts` pins the table as a characterisation instead of pretending to compute it.

**The box wraps the drawing, and that costs area on diagonals**: ×2 to ×2.6 for most, ×3.9 for the whip at level 5 (60×340 becomes 283×283). It was a deliberate call — reach should match what you see — and the real fix is an oriented overlap test, which belongs to the Phaser port. `standOff` therefore derives from the blade's **`long`**, never from `max(w, h)`: with a breathing bounding box the reach would pulse through the swing.

**The arm is not rotated — it has eight hand-drawn bands** (`ArmPose`). Its wrist is a _single empty pixel_, and that notch is the only thing keeping the fist from reading as a snout; no resampler survives it. `ARM_DOWN` is `ARM_UP` reversed, which is exact and free, and fixed a straight-down aim that drew the arm sideways. With the weapon at sixteen steps and the arm at eight, the worst mismatch is 22.5° at the fist, which reads as a wrist angle.

**What a hit looks like is per projectile** (`impact` in the behaviour table): steel sparks, mint flashes green, bristles leave a pale fleck. Every hit in the game used to be the same three sparks, so eight weapons felt identical on contact. The armour rejection overrides it — that reads as "nothing gets in here" and must look the same whatever you swing.

Held-weapon art is 30×18 (22×12 held no sword, scythe or bow) with the grip on the **left**, because every inclination is that mask rotated about the grip. A single material per piece can't carry steel _and_ wood, so the reference language — wooden haft, brass ferrule, cyan energy — comes in through extra detail letters (`W`/`w`, `O`, `E`) mapped in `render/weapons.ts`. Keep detail as **accent**: filling a blade with bristles or a body with brass turns the piece into a coloured blob.

Adding an enemy means touching **six** places: the `subType` union in `src/types.ts`, the table in `data/enemies.ts` (including its `contactDamage`), the silhouette in `render/sprites/masks/enemies.ts`, its `MATERIALS` entry in the *different* file `render/sprites/enemies.ts`, a case in `updateEnemyAI`, `ENEMY_TEXT_KEY` in `i18n/subjects.ts`, and locale entries in both `i18n/en.ts` and `i18n/es.ts`. The typed dictionary and `render/preview.test.ts` make the locale entries a **compile error and a test failure** rather than a blank label, so you cannot forget those. The two that stay **silent** are the art and the AI: a missing `ENEMY_ART` entry makes `hasEnemySprite` false and the enemy draws *nothing*, and the `updateEnemyAI` switch has no `default`, so a missing case leaves the enemy standing still with no gravity.

### Theme is carried by the silhouette, and the ramp names betray the original design

Several colour ramps are named `turret`, `rusher`, `fiend`, `grunt` and `stone` — action-game archetypes, not dental ones. That is the tell: the roster was conceived as generic archetypes and dressed dental afterwards, and it showed. The stage-3 boss was a **literal WWII tank** (turret, mantlet, 52px cannon with a muzzle brake, sloped glacis, exhaust stack, five road wheels, two 15-link tracks) in `metal`, with a diesel-engine intro sound, inside a mouth; the common tartar enemy had a 12×7 gun tube with a red muzzle flash. Both are now mineral: `calculus` (the boss) and `tartar_spire`, both on `tartarCrust`. `turret` and `stone` are now unused ramps.

Two rules came out of redrawing them, and the second cost a rewrite:

- **Draw a fissure by *subtracting*, not by adding a piece.** A tube merged onto a silhouette is a barrel however it is shaded; material removed from a bulge is a crack in stone. It is the same primitive either way — the direction is the whole difference.
- **Nothing may form a series.** The rule is *not* "make them different sizes". The first crust had six grip lobes of six different sizes along its base and still read as a **tank's road wheels**, because they sat 22–29px apart — near-enough regular that the eye follows them as a row. A deposit needs a torn edge: two or three asymmetric lobes and the rest of the rim bitten away at varying widths.

- **A feature that does not stick out of the outline does not exist.** This one cost a full pass on four bosses at once: chipped bites placed where the king's regalia already covers the tooth, tentacles starting at `y=74` on a phantom whose body reaches `y=85`, wings and a halo inside a warden crown whose ellipse spanned `y=11..97`. Every one of them was invisible. Before adding anything, work out the current outermost extent at that point and make the new piece exceed it — or shrink the primitive that is swallowing it, which is what the warden needed.
- **A closed ring always wins the silhouette.** The deity was "too circular", so the first fix kept its outer annulus and merely bit gaps out of it. It got *worse*: the enlarged petals grew until they touched the ring, the gap between them filled, and the whole thing became a donut with spokes. An enclosing ring defines the edge by itself, so no amount of variation inside it registers. The fix was to delete the ring and let the petals *be* the outline, leaving only two loose arcs.

Two more things worth knowing before drawing a boss. **Terraces beat stacked ellipses**: large overlapping ovals fuse into one unreadable mass at 160×140 and internal seams drawn inside them read as noise — a layered deposit reads through its *stepped outline*, so make the layers real steps, each narrower and offset. And **a wide body needs internal cracks or it goes flat**: `shadeMask` derives slope from distance to an edge, so the middle of a 140px-wide shape is far from everything and renders as a dark slab. Subtracting short, unaligned cracks creates interior edges and with them volume — the same tool the tank used to separate its wheels, used for the opposite purpose.

### Bodies need a surface, and two bosses had no attack drawing at all

Every boss was a face on a smooth gradient — the Decay Deity was **one 24×18 eye on a 140×140 canvas**. `bosses.ts` now has `grain` (deterministic speckle from `render/noise.ts`, never `Math.random`, because baked art with a real random seed would differ every run), `strands` (vertical fibres for anything biofilm-like), `well` (rings darkening inward, so a disc reads as a pit) and `tint` (turn any shape primitive into a detail blob, which is how a caries is drawn as a dark ellipse instead of hand-written rows). Watch the ramp when seeding grain: `void` runs from `#04040c` to `#7d7dd0`, so dark speckle just muddies it — the deity needed **light** grain, and a `well` sized to the core rather than the whole sprite, or the petals lose their volume.

`BOSS_ATTACK_STATE` in `render/preview.ts` had `phantom: 0` and `wisdom_warden: 0` — *idle* — and that was not a mistake in the table: neither builder took `state`, so both attacked wearing the face they wait with. The phantom now gathers before its dash (state 1, which is the half-second of wind-up the AI already had and never showed) and the warden opens its closed eyes to judge (state 2). A boss sprite bakes per `variant:state:phase`, so a state with its own drawing costs one canvas, not per-frame work.

### Deaths and enemy shots

`deathBurstFor` (`data/enemies.ts`) gives each enemy and boss its own colour, particle count and `spread`. They all died **identically** before: eighty 4×4 squares of the enemy's flat colour, all from the exact geometric centre, so a 32×32 bacterium and a 160×140 boss came apart the same way. `spread` scatters the origins across the body, which is what makes a big mass crumble instead of bursting from a point.

**`spawnProjectile`'s enemy branch used to hardcode `vy: 0` and never normalised `dx`**, which broke four attacks — three of them boss signature moves. The candy bomber asked for `(0, 1)` and got a *stationary pellet hanging in mid-air*; the deity's spiral collapsed into three horizontal pellets that stopped dead whenever the cosine crossed zero; the king's five-way fan came out as five superimposed bullets at `vx = -81` (ten frames to cross the screen). Two of those also aimed wrong: the king always fired left regardless of where the player was, and the phantom aimed with **`p.facing`** — the *player's* facing, not the direction toward them. `weapons.test.ts` pins the normalisation and the downward shot now.

There are twelve common enemies. Four of them need a rule that the collision loop can't express on its own, and those rules live in `game/enemies.ts` (or `data/enemies.ts` when both the simulation and the renderer need them) so `GameCanvas` stays on the replace-not-repair list:

- `applyEnemyDamage(enemy, amount, fromX)` — the `calculus_shell`'s armour only protects the side it faces, so damage goes through here instead of `enemy.hp -= …`.
- `spawnDeathSpawn(enemy, enemies, stage)` — what an enemy leaves behind. Today only the `abscess_bloater`, which bursts into three bacteria.
- `collidesWithPlatforms(enemy, horizontal)` — replaces the old chain of `!==` in the loop, and is **state-dependent**: the burrowed `enamel_borer` passes through the floor.
- `isBurrowed(enemy)` lives in `data/enemies.ts` because both layers need it: the simulation to skip collisions, the renderer to draw the tell-tale mound instead of the sprite.

### Hidden boss

`world.triggers` (see `src/game/triggers.ts`) accumulates **simulation** time for the behavioural triggers — idling, level stagnation, kill rush — and `advanceTriggers` returns whether to call `spawnHiddenBoss`; the boss speedkill is `isBossSpeedkill`. Thresholds live in `HIDDEN_BOSS_TRIGGERS` (`data/enemies.ts`). It used to be a ref comparing `Date.now()`, which kept counting while paused or backgrounded (a hidden tab gets zero rAF callbacks), so pausing three minutes summoned the boss on return.

The `wisdom_warden` variant deliberately bypasses the arena clamps, forces a 100% powerup drop, and relies on the "enemy bullet with `damage > 20` curves toward the player" branch in the main projectile update instead of carrying its own homing logic. Killing it grants a perk but does **not** clear the stage — `level.bossDefeated` tracks the _stage_ boss, and the stage only closes once no boss of any kind is left alive.

### The database screen says each thing exactly once

`components/views/IntelDatabase.tsx` (TACTICAL KNOWLEDGE, opened from the menu, closed with the header button **or Escape**) is five tabs — classes, arsenal, threats, bosses, upgrades — and every subject has exactly one home: its sprite, name, description and numbers live together in its own tab and appear nowhere else.

It used to be one long scroll of six panels led by an embedded art gallery, and that gallery was the problem. It printed every one of the catalogue's ten groups, which meant **enemies twice** (its captions are the enemy names and its sprites are the same items at the same scale as the threats section), **bosses twice**, and **weapons three times** — the third because the pickups group labels each canister with the name of the weapon it drops. It also put **106 animated canvases** on one screen, all on the shared clock and all repainting every frame, among them 31 material ramps, five 800×450 stage backgrounds and the credits scene. That is development content and it already has a home: `?sprites=<group>`. `gallery_title`, `gallery_desc`, `groupTitle` and `previewLabel` moved there with it, which is also what keeps them from being dead code.

Two rules the screen keeps:

- **Never pass a canvas a label that repeats the heading beside it.** Every card printed the name as the `aria-label` of its sprite *and* as its `<h4>`, so a screen reader read each entry's name twice; in the gallery that was 80 times.
- **No number that the game computes may be written into a translated string.** `arsenal_title` carried "Max 5" in both locales when `MAX_LEVEL` exists, and the two achievement descriptions spelled out the milestone sequences by hand — which is how the menu came to advertise 20/30/50/80 kills while the game granted 20/40/70/110. `progression.ts` now exports `scoreMilestones` and `killMilestones`, computed with the same arithmetic that claims them, and `progression.test.ts` pins that the advertised list equals the one the claim loop actually produces.

### Localization

`src/i18n/en.ts` is the reference dictionary and exports its own shape as `Dictionary`; `src/i18n/es.ts` is typed against it, so a missing or extra key is a **compile error**, not a runtime `undefined`. `src/i18n/index.ts` exports `TEXT: Record<Language, Dictionary>`. Data modules store IDs only and hydrate localized text at call time (`src/game/perks.ts` is the reference pattern).

### The legal texts are the one thing that does *not* live in `Dictionary`

`src/legal/` holds the terms, the privacy policy and the licences page — prose, not labels — and it stays out of `src/i18n/` on purpose. `locales.test.ts` asserts exact **path** parity, so legal prose inside the dictionary would force EN and ES to have the same number of paragraphs, which is an editorial straitjacket (the two drafting traditions split clauses differently). Worse, it would dilute what that test means: today its parity says "every UI label is translated"; afterwards it would mostly say "somebody pressed Enter the same number of times". Only the screen's chrome — tab labels, "Last updated" — lives in the dictionary, under `legal:`.

Parity there is by **`LegalSection.id`**, which is never translated: a section may run two paragraphs in one language and three in the other, but it may not go missing. `es.ts` is annotated `: LegalPack`, never `typeof en` — with `typeof`, every English sentence becomes a literal type the Spanish has to match character for character. Same division of labour the dictionary already uses: the type catches the shape, the test catches the content.

Four things here are load-bearing, and three of them are obligations rather than preferences:

- **The site already redistributes Press Start 2P** (`dist/assets/press-start-2p-*.woff2`/`.woff`), and OFL-1.1 clause 2 requires the copyright notice **and the full licence text** to travel with those bytes. That is what `public/legal/OFL.txt` is for, and why `public/legal` is in `.prettierignore`: reformatting a licence you are obliged to reproduce verbatim is a compliance problem, not a style one.
- **Vite strips licence comments when bundling**, so `ATTRIBUTIONS` (`src/legal/attributions.ts`) is the only place React, react-dom, lucide-react and Tailwind's notices reach the player. `attributions.test.ts` reads `package.json` and fails if a runtime dependency has no entry — adding a dep and forgetting its notice is exactly the silent failure the rest of the suite hunts. It is **hand-written on purpose**: licence scanners mangle lucide's dual ISC-with-embedded-MIT notice, which is the one case present here.
- **No fact the code knows may be written into the prose.** Owner, domain, contact, jurisdiction and dates come from `src/legal/identity.ts`; links come from `LEGAL_LINKS`, and `legal.test.ts` rejects any `href` that is not in that table. Same rule as "no number the game computes goes into a translated string".
- **The published privacy policy asserts that the game makes no outbound request.** Adding a fetch, a CDN, an analytics beacon or a font from Google breaks a legal claim, not just a build convention. `public/_headers` backs it with `connect-src 'none'`.

The screen itself (`components/views/LegalScreen.tsx`) is a clone of `IntelDatabase` because that is the project's only screen with real scrolling — keep the `min-h-0` pair on both the column and the scroll child. `Credits` cannot host it: it is deliberately built to *shrink* with `useFitScale` rather than scroll. It mounts as an **overlay** in `App.tsx`, never as a short-circuit `return` like `?sprites=`, because that would unmount `GameCanvas`. Its URL (`legalRoute.ts`, `/privacy`, `?legal=…`) is cross-checked against `public/_redirects` by a test, so a rewrite and the parser cannot drift apart.

## Where balance lives

All tuning numbers live in `src/game/data/` — nothing should be re-hardcoded at a call site:

- `data/difficulty.ts` — drop rate, damage dealt/taken, hp and milestone multipliers. Read it through `getDifficulty()`, which falls back to `normal`.
- `data/weapons.ts` — per-weapon level 1–5 damage/speed/size, fire-rate cooldowns (`getFireCooldown`), the enemy bullet, and `HOMING_DAMAGE_THRESHOLD` (enemy bullets above it curve toward the player — that is how the hidden boss homes).
- `data/enemies.ts` — enemy spawn thresholds with per-stage HP scaling and per-enemy `contactDamage` (read it through `contactDamageFor`), boss stats (`getStageBoss`, `HIDDEN_BOSS`, `findBoss`), the wave cadence (`waveInterval`), the cull margin and `HIDDEN_BOSS_TRIGGERS`.
- `data/stages.ts` — the per-stage **scene**, not just its palette: which zone of the mouth it is, the tooth measurements and arch curve, which background layers take part, five separate decay values (plaque, tartar, cavities, stain, inflammation), how many teeth are missing, the dentist's instrument, saliva and steam. It used to be three ramp names, which is exactly why the five stages were the same picture in different colours. `stages.test.ts` pins that every stage is a distinct zone with its own instrument and that **decay never goes backwards** from one stage to the next.
- `data/physics.ts` and `data/palette.ts` — the former `constants.ts`, split into simulation constants and colours. Beyond movement, `physics.ts` also holds the timestep (`FIXED_STEP`, `MAX_STEPS_PER_FRAME`), invulnerability windows, knockback, pit-fall damage, the stage-clear delay and the score awards — all of which used to be literals inside `update()`. The palette sits in `data/` rather than `render/` on purpose: entities carry `color` as a field, so the domain would otherwise have to import the presentation layer.
- `data/characters.ts` — the four tooth classes. Before this the menu's class choice only picked a sprite.
- `src/game/perks.ts` — `PERK_DEFINITIONS` weights and the `applyPerk` effects. `getRandomPerks` takes the player so it can drop perks that would do nothing (a full heal at full health).
- `src/game/progression.ts` — the perk milestones. Score: 6.200 then every 8.000. Kills: 20, 30, 50, 80, 120 (the step is added _then_ incremented — getting that backwards is what made the real sequence 20/40/70/110 while the menu advertised the other one).

`data/balance.test.ts` pins these numbers deliberately: it is the acceptance criteria for the Phaser port, not an implementation test. A failure there means the balance changed — decide whether that was intentional before updating it.

The rules the simulation has to keep are pinned too, and those _are_ implementation tests: `progression.test.ts` (milestone sequences), `triggers.test.ts` (hidden-boss clocks are dt-based, so a paused game never advances them), `player.test.ts` (class profiles differ; a pit fall always lands on solid ground and costs a life instead of hanging the run), `level.test.ts` (`findRespawn` never returns a spot in mid-air), `enemies.test.ts` (culling spares bosses), `weapons.test.ts` (the damage multiplier applies exactly once, at spawn), `loop.test.ts` (a late frame is never recovered as a burst of steps), `world.test.ts` (the published snapshot is a copy, so damage reaches the HUD), `render/orientation.test.ts` (same bake id ⇒ same pixels; the drawing measures what the hitbox measures; the drawing's principal axis _is_ the aim angle; a sweep's useful edge faces the right way), `data/aim.test.ts` (the mirror identity, and the axes give exactly today's boxes) and `masks/shapes.test.ts` (90° stays exact, a one-pixel stroke survives a tilt). Each one covers a bug that shipped; keep them.

Boss AI state machines still live in `src/game/enemies.ts`; `bossState` numbers mean different things per `bossVariant`.

## Gotchas

- All source lives under `src/`, aliased as `@/*`. Paths in this document are relative to it.
- Styling is Tailwind v4 through `@tailwindcss/vite`, configured entirely in `src/styles.css` (`@import "tailwindcss"`) — there is no `tailwind.config`. The font is self-hosted via `@fontsource/press-start-2p`. Nothing loads from a CDN; keep it that way so the game works offline.
- The markup uses `animate-in` / `fade-in` / `slide-in-from-bottom` classes from `tailwindcss-animate`, which is **not** installed — those classes are inert no-ops (they were inert under the CDN too). Don't assume those transitions render.
- `pnpm lint` is green on errors but carries 14 deliberate warnings, **all of them in `GameCanvas.tsx`, `SpriteGallery.tsx` and `audio.ts`**: `any` in the engine modules, and the `react-hooks` rules that the monolith violates by design (`Math.random()` inside the simulation, which runs from the rAF callback rather than during render). They are scoped in `eslint.config.js` and resolve with the Phaser migration — don't "fix" them by rewriting the monolith piecemeal. The count is the current eslint's, not a target: what matters is that no file outside those three carries any, so `pnpm eslint <files you touched>` should come back silent.
