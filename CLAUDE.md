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

## Architecture

A single-page React app. The game lives in `src/game/`, in layers that only depend downward: `data/` (pure tuning tables) ← `game/` (simulation) and `render/` (Canvas 2D drawing). Neither layer imports React. `src/components/GameCanvas.tsx` is the shell that owns the loop and input and bridges the two worlds.

### State ownership

- **`src/App.tsx`** owns the `GameState` enum machine (`src/types.ts`) and the run configuration: language, difficulty, character, loadout, input method. Every view (`MainMenu`, `PauseMenu`, `PerkMenu`, `GameOver`, `Credits`) is an absolutely-positioned overlay — `GameCanvas` stays mounted the whole time.
- Restarting is `setSessionId(s => s + 1)`; `GameCanvas` watches `sessionId` and calls `resetGame()`.
- **`src/game/world.ts`** defines `World` — the whole mutable simulation state — and `createWorld(config)` which builds it (including the player, via `src/game/player.ts`). `GameCanvas` holds one in a `useRef` and mutates it in place; restarting is `entities.current = createWorld(runConfig)`.
- **The engine never calls React.** `World` carries two outbound channels instead: `world.hud` (continuous values the HUD shows) and `world.events` (one-shots: `perk-offer`, `victory`, …). The rAF loop drains the queue and publishes the HUD snapshot **once per frame**, skipping `setState` when `hudChanged()` reports nothing moved. Adding a HUD value means extending `HudSnapshot` and `hudChanged`, not adding a `useState`.

### Game loop

- `requestAnimationFrame` loop in a `useEffect` keyed on `gameState`. It runs during `PLAYING` **and** `PERK_SELECTION`, but only calls `update(dt)` when `PLAYING` — during perk selection it keeps drawing so the frozen frame shows behind the perk cards.
- `dt` is clamped to 0.1s.
- The loop stops rescheduling itself when `hp <= 0 && lives <= 0`, which is what triggers `handleGameOver` (it awaits Gemini for the death diagnosis).
- **Mixed time base:** positions integrate per *frame* (`p.x += p.vx`, `p.vy += GRAVITY`) while timers and cooldowns are `dt`-scaled, and the weapon cooldown `p.frameTimer` decrements by 1 per frame. Movement is framerate-dependent, timers are not. Preserve whichever convention the surrounding code uses.

### `src/game/` modules mutate arguments; they are not pure transforms

`spawnProjectile(world.projectiles, …)`, `spawnEnemy(level, cameraX, enemies)` and `updateEnemyAI(enemy, player, world, audio)` receive what they must mutate and push into it. The boss spawners take the whole `World` and write to `world.hud`; they no longer receive React setters.

### Perk flow (crosses the React boundary both ways)

`update()` detects a score/kill milestone or a boss kill → `getRandomPerks` → `onPerkSelectStart` → `App` switches to `PERK_SELECTION` → `PerkMenu` → the chosen id comes back down as the `selectedPerkId` prop → a `GameCanvas` effect calls `applyPerk` on the player ref, force-clears every input flag (anti-stuck-key), then `onPerkApplied` returns to `PLAYING`. `update()` `return`s early on a milestone, skipping the rest of that frame.

### Level, camera, collision

- Fixed 800×450 backing store (`src/game/data/physics.ts`), CSS-scaled with `object-contain`; mouse coordinates are rescaled through `getBoundingClientRect`.
- `generateLevel(width)` builds a procedural platform array. `levelWidth` starts at 8000 and grows +2000 per stage. The last 800px is the boss arena: once `bossSpawned` the camera locks there and the player's x is clamped into it. Clearing stage 5 fires `onVictory` → `Credits`.
- Platforms are solid from all sides (not one-way). Collision is axis-separated: `checkPlatformCollisions` is called once after the x integration and again after the y integration, using the AABB test in `src/game/physics.ts`.

### Rendering

All drawing lives in `src/game/render/` and nothing outside it draws. There are no image assets — every sprite, enemy, background and transition is Canvas 2D code. `render/scene.ts` composes a frame (fixed background → camera-translated world → screen-space transition); the rest are leaf modules per subject. These are pure `ctx` calls with no state, which is exactly what lets the Phaser port re-run them **once** into baked textures instead of every frame.

Adding an enemy means touching five places: the `subType` union in `src/types.ts`, the table in `data/enemies.ts`, a draw function in `render/enemies.ts`, a case in `updateEnemyAI`, and locale entries.

### Hidden boss

`hiddenBossState` (a ref in `GameCanvas`) tracks wall-clock `Date.now()` behavioural triggers — idling, level stagnation, kill rush, boss speedkill — and calls `spawnHiddenBoss`. The `wisdom_warden` variant deliberately bypasses the arena clamps, forces a 100% powerup drop, and relies on the "enemy bullet with `damage > 20` curves toward the player" branch in the main projectile update instead of carrying its own homing logic.

### Localization

`src/i18n/en.ts` is the reference dictionary and exports its own shape as `Dictionary`; `src/i18n/es.ts` is typed against it, so a missing or extra key is a **compile error**, not a runtime `undefined`. `src/i18n/index.ts` exports `TEXT: Record<Language, Dictionary>`. Data modules store IDs only and hydrate localized text at call time (`src/game/perks.ts` is the reference pattern).

## Where balance lives

All tuning numbers live in `src/game/data/` — nothing should be re-hardcoded at a call site:

- `data/difficulty.ts` — drop rate, damage dealt/taken, hp and milestone multipliers. Read it through `getDifficulty()`, which falls back to `normal`.
- `data/weapons.ts` — per-weapon level 1–5 damage/speed/size, fire-rate cooldowns (`getFireCooldown`), the enemy bullet, and `HOMING_DAMAGE_THRESHOLD` (enemy bullets above it curve toward the player — that is how the hidden boss homes).
- `data/enemies.ts` — enemy spawn thresholds with per-stage HP scaling, plus boss stats (`getStageBoss`, `HIDDEN_BOSS`).
- `data/stages.ts` — the per-stage colour palette the background reads.
- `data/physics.ts` and `data/palette.ts` — the former `constants.ts`, split into simulation constants and colours. The palette sits in `data/` rather than `render/` on purpose: entities carry `color` as a field, so the domain would otherwise have to import the presentation layer.
- `src/game/perks.ts` — `PERK_DEFINITIONS` weights and the `applyPerk` effects.
- `src/constants.ts` — physics, player speed/jump/dash, perk milestones, shield regen, color palette.

`data/balance.test.ts` pins these numbers deliberately: it is the acceptance criteria for the Phaser port, not an implementation test. A failure there means the balance changed — decide whether that was intentional before updating it.

Boss AI state machines still live in `src/game/enemies.ts`; `bossState` numbers mean different things per `bossVariant`.

## Gotchas

- All source lives under `src/`, aliased as `@/*`. Paths in this document are relative to it.
- Styling is Tailwind v4 through `@tailwindcss/vite`, configured entirely in `src/styles.css` (`@import "tailwindcss"`) — there is no `tailwind.config`. The font is self-hosted via `@fontsource/press-start-2p`. Nothing loads from a CDN; keep it that way so the game works offline.
- The markup uses `animate-in` / `fade-in` / `slide-in-from-bottom` classes from `tailwindcss-animate`, which is **not** installed — those classes are inert no-ops (they were inert under the CDN too). Don't assume those transitions render.
- `pnpm lint` is green on errors but carries deliberate warnings: `any` in the engine modules, and the `react-hooks` rules that `GameCanvas.tsx` violates by design (simulation state in a ref, mutated during render). Both are scoped in `eslint.config.js` and resolve with the Phaser migration — don't "fix" them by rewriting the monolith piecemeal.
