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

Install-script approvals live in `pnpm-workspace.yaml` under `allowBuilds` (pnpm 11 moved these out of `package.json`). Only `esbuild` is allowed — it needs its postinstall to link the native binary Vite uses.

**Gemini API key (optional):** create `.env.local` at the repo root with `GEMINI_API_KEY=...`. `vite.config.ts` inlines it as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY` (so it ends up in the client bundle — it is public to anyone who opens the game). Without a key, `src/services/geminiService.ts` sets its client to `null` and every call returns a hardcoded localized fallback — the game is fully playable without one.

## Migration in progress

This repo is mid-migration under `C:\Users\user\.claude\plans\compiled-sparking-spindle.md`. Done: pnpm + tooling, balance data extracted to `src/game/data/`, typed i18n, rendering split out of the simulation, a typed `World`, and the engine decoupled from React. Next: the rewrite onto **Phaser 4**, with React kept only as the UI shell.

`src/components/GameCanvas.tsx` still owns the loop, input, physics and camera, and is scheduled for **replacement rather than repair** — Phaser supplies all four. Do not grow it: new simulation logic goes in `src/game/`, new tuning numbers in `src/game/data/`, new drawing in `src/game/render/`. `git tag pre-phaser` marks the last pre-migration commit.

A gameplay audit has since been applied on top; every fix it needed was pulled *out* of the monolith into `src/game/` (`triggers.ts`, `progression.ts`, `fallIntoPit`, `findRespawn`, `cullEnemies`, `syncHud`) rather than added to it, and each one carries tests. The behaviours worth knowing before touching the loop: fixed timestep, hold-to-fire governed by `getFireCooldown`, the damage multiplier applied at spawn, and `Escape` only toggling `PLAYING`↔`PAUSED`.

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
- **Mixed time base, now safe:** positions integrate per *step* (`p.x += p.vx`, `p.vy += GRAVITY`) while timers and cooldowns are `dt`-scaled, and the weapon cooldown `p.frameTimer` decrements by 1 per step. Both conventions coexist because a step always represents 1/60s — this is what the fixed timestep buys. Preserve whichever convention the surrounding code uses, and do **not** reintroduce `Date.now()` into the simulation (rendering may use it freely).
- `syncHud(world)` runs once per frame in the loop, right before the `hudChanged` check, so it also refreshes while the game is frozen picking a perk.
- The loop stops rescheduling itself when `hp <= 0 && lives <= 0`, which is what triggers `handleGameOver` (it awaits Gemini for the death diagnosis).

### `src/game/` modules mutate arguments; they are not pure transforms

`spawnProjectile(world.projectiles, …)`, `spawnEnemy(level, cameraX, enemies)` and `updateEnemyAI(enemy, player, world, audio)` receive what they must mutate and push into it. Same for `fallIntoPit(player, platforms)` and `advanceTriggers(state, dt, …)`. The boss spawners take the whole `World` and write to `world.hud`; they no longer receive React setters.

The exceptions that *do* return a new value are the filters: `cullEnemies(enemies, cameraX)` returns the survivors, mirroring the existing `projectiles.filter(…)` style in the loop.

### Perk flow (crosses the React boundary both ways)

`update()` detects a score/kill milestone or a boss kill → `getRandomPerks` → `onPerkSelectStart` → `App` switches to `PERK_SELECTION` → `PerkMenu` → the chosen id comes back down as the `selectedPerkId` prop → a `GameCanvas` effect calls `applyPerk` on the player ref, force-clears every input flag (anti-stuck-key), then `onPerkApplied` returns to `PLAYING`. `update()` `return`s early on a milestone, skipping the rest of that frame.

### Level, camera, collision

- Fixed 800×450 backing store (`src/game/data/physics.ts`), CSS-scaled with `object-contain`; mouse coordinates are rescaled through `getBoundingClientRect`.
- `generateLevel(width)` builds a procedural platform array. `levelWidth` starts at 8000 and grows +2000 per stage. The last 800px is the boss arena: once `bossSpawned` the camera locks there and the player's x is clamped into it. Clearing stage 5 fires `onVictory` → `Credits`.
- Platforms are solid from all sides (not one-way). Collision is axis-separated: `checkPlatformCollisions` is called once after the x integration and again after the y integration, using the AABB test in `src/game/physics.ts`.

### Rendering

All drawing lives in `src/game/render/` and nothing outside it draws. There are no image assets — every sprite, enemy, background and transition is Canvas 2D code. `render/scene.ts` composes a frame (background → camera-translated world → screen-space transition); the rest are leaf modules per subject. These are pure `ctx` calls with no state, which is exactly what lets the Phaser port re-run them **once** into baked textures instead of every frame.

**The background is a declared stack** (`render/background/`), not a function with four `blit` calls and its parallax factors written inline. Each layer declares its depth and how it bakes itself from the stage's scene, so adding a layer is adding an entry. Three rules the stack keeps, each with a test in `background/stack.test.ts`:

- **Draw order comes from the stack, never from the data.** `scene.layers` says *which* layers take part; the order is always `LAYERS`. A mistyped list would otherwise put the throat in front of the gums, and that mistake is invisible in review.
- **Tiling layers are indexed by world column, not screen position.** That is what keeps column 37 the same tooth as the camera passes; a screen index would make the arcade boil.
- `anchor: 'screen'` marks a layer that *frames* the scene instead of living in it (the foreground gums). Those have parallax 0 even though they draw in front of everything, so they sit outside the depth ordering.

Variation comes from `render/noise.ts` — a deterministic hash, never `Math.random()`. Baked art with a random seed is frozen with whatever it rolled that session, so two runs of the same stage would not share a scenery. That shipped once in the credits scene.

Two traps worth knowing before drawing anything new:

- **A rectangle one pixel wide is useless for dithering.** The 4×4 matrix is anchored to absolute coordinates, so a narrow strip only touches one of its four phases: at low levels some columns come out dotted and their neighbours empty. A horizontal gradient built from 1px columns reads as a grid of vertical stripes. Step in fours, or evaluate the threshold per pixel (`background/cheeks.ts` does the latter).
- **A thin, long detail does not read as relief — it reads as a scratch.** It needs thickness with two faces (light above, shadow below) and short runs. `ditherOver` is the primitive for anything that goes *on top* of another layer: unlike `dither`/`ditherFill` it does not paint the base tone, so it dirties without covering.

Adding an enemy means touching five places: the `subType` union in `src/types.ts`, the table in `data/enemies.ts` (including its `contactDamage`), the silhouette in `render/sprites/masks/enemies.ts` plus its `MATERIALS` entry, a case in `updateEnemyAI`, and locale entries in both `i18n/en.ts` and `i18n/es.ts`. The typed dictionary and `render/preview.test.ts` make the last one a **compile error and a test failure** rather than a blank label, so you cannot forget it.

There are twelve common enemies. Four of them need a rule that the collision loop can't express on its own, and those rules live in `game/enemies.ts` (or `data/enemies.ts` when both the simulation and the renderer need them) so `GameCanvas` stays on the replace-not-repair list:

- `applyEnemyDamage(enemy, amount, fromX)` — the `calculus_shell`'s armour only protects the side it faces, so damage goes through here instead of `enemy.hp -= …`.
- `spawnDeathSpawn(enemy, enemies, stage)` — what an enemy leaves behind. Today only the `abscess_bloater`, which bursts into three bacteria.
- `collidesWithPlatforms(enemy, horizontal)` — replaces the old chain of `!==` in the loop, and is **state-dependent**: the burrowed `enamel_borer` passes through the floor.
- `isBurrowed(enemy)` lives in `data/enemies.ts` because both layers need it: the simulation to skip collisions, the renderer to draw the tell-tale mound instead of the sprite.

### Hidden boss

`world.triggers` (see `src/game/triggers.ts`) accumulates **simulation** time for the behavioural triggers — idling, level stagnation, kill rush — and `advanceTriggers` returns whether to call `spawnHiddenBoss`; the boss speedkill is `isBossSpeedkill`. Thresholds live in `HIDDEN_BOSS_TRIGGERS` (`data/enemies.ts`). It used to be a ref comparing `Date.now()`, which kept counting while paused or backgrounded (a hidden tab gets zero rAF callbacks), so pausing three minutes summoned the boss on return.

The `wisdom_warden` variant deliberately bypasses the arena clamps, forces a 100% powerup drop, and relies on the "enemy bullet with `damage > 20` curves toward the player" branch in the main projectile update instead of carrying its own homing logic. Killing it grants a perk but does **not** clear the stage — `level.bossDefeated` tracks the *stage* boss, and the stage only closes once no boss of any kind is left alive.

### Localization

`src/i18n/en.ts` is the reference dictionary and exports its own shape as `Dictionary`; `src/i18n/es.ts` is typed against it, so a missing or extra key is a **compile error**, not a runtime `undefined`. `src/i18n/index.ts` exports `TEXT: Record<Language, Dictionary>`. Data modules store IDs only and hydrate localized text at call time (`src/game/perks.ts` is the reference pattern).

## Where balance lives

All tuning numbers live in `src/game/data/` — nothing should be re-hardcoded at a call site:

- `data/difficulty.ts` — drop rate, damage dealt/taken, hp and milestone multipliers. Read it through `getDifficulty()`, which falls back to `normal`.
- `data/weapons.ts` — per-weapon level 1–5 damage/speed/size, fire-rate cooldowns (`getFireCooldown`), the enemy bullet, and `HOMING_DAMAGE_THRESHOLD` (enemy bullets above it curve toward the player — that is how the hidden boss homes).
- `data/enemies.ts` — enemy spawn thresholds with per-stage HP scaling and per-enemy `contactDamage` (read it through `contactDamageFor`), boss stats (`getStageBoss`, `HIDDEN_BOSS`, `findBoss`), the wave cadence (`waveInterval`), the cull margin and `HIDDEN_BOSS_TRIGGERS`.
- `data/stages.ts` — the per-stage **scene**, not just its palette: which zone of the mouth it is, the tooth measurements and arch curve, which background layers take part, five separate decay values (plaque, tartar, cavities, stain, inflammation), how many teeth are missing, the dentist's instrument, saliva and steam. It used to be three ramp names, which is exactly why the five stages were the same picture in different colours. `stages.test.ts` pins that every stage is a distinct zone with its own instrument and that **decay never goes backwards** from one stage to the next.
- `data/physics.ts` and `data/palette.ts` — the former `constants.ts`, split into simulation constants and colours. Beyond movement, `physics.ts` also holds the timestep (`FIXED_STEP`, `MAX_STEPS_PER_FRAME`), invulnerability windows, knockback, pit-fall damage, the stage-clear delay and the score awards — all of which used to be literals inside `update()`. The palette sits in `data/` rather than `render/` on purpose: entities carry `color` as a field, so the domain would otherwise have to import the presentation layer.
- `data/characters.ts` — the four tooth classes. Before this the menu's class choice only picked a sprite.
- `src/game/perks.ts` — `PERK_DEFINITIONS` weights and the `applyPerk` effects. `getRandomPerks` takes the player so it can drop perks that would do nothing (a full heal at full health).
- `src/game/progression.ts` — the perk milestones. Score: 6.200 then every 8.000. Kills: 20, 30, 50, 80, 120 (the step is added *then* incremented — getting that backwards is what made the real sequence 20/40/70/110 while the menu advertised the other one).

`data/balance.test.ts` pins these numbers deliberately: it is the acceptance criteria for the Phaser port, not an implementation test. A failure there means the balance changed — decide whether that was intentional before updating it.

The rules the simulation has to keep are pinned too, and those *are* implementation tests: `progression.test.ts` (milestone sequences), `triggers.test.ts` (hidden-boss clocks are dt-based, so a paused game never advances them), `player.test.ts` (class profiles differ; a pit fall always lands on solid ground and costs a life instead of hanging the run), `level.test.ts` (`findRespawn` never returns a spot in mid-air), `enemies.test.ts` (culling spares bosses), `weapons.test.ts` (the damage multiplier applies exactly once, at spawn), `loop.test.ts` (a late frame is never recovered as a burst of steps), `world.test.ts` (the published snapshot is a copy, so damage reaches the HUD). Each one covers a bug that shipped; keep them.

Boss AI state machines still live in `src/game/enemies.ts`; `bossState` numbers mean different things per `bossVariant`.

## Gotchas

- All source lives under `src/`, aliased as `@/*`. Paths in this document are relative to it.
- Styling is Tailwind v4 through `@tailwindcss/vite`, configured entirely in `src/styles.css` (`@import "tailwindcss"`) — there is no `tailwind.config`. The font is self-hosted via `@fontsource/press-start-2p`. Nothing loads from a CDN; keep it that way so the game works offline.
- The markup uses `animate-in` / `fade-in` / `slide-in-from-bottom` classes from `tailwindcss-animate`, which is **not** installed — those classes are inert no-ops (they were inert under the CDN too). Don't assume those transitions render.
- `pnpm lint` is green on errors but carries 12 deliberate warnings: `any` in the engine modules, and the `react-hooks/purity` rule that `GameCanvas.tsx` violates by design (`Math.random()` inside the simulation, which runs from the rAF callback rather than during render). They are scoped in `eslint.config.js` and resolve with the Phaser migration — don't "fix" them by rewriting the monolith piecemeal. The `react-hooks/refs` warning is gone: nothing reads `entities.current` during render any more.
