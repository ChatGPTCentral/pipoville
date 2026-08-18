# Aleville — Design & Experimentation Guide

Aleville — a self-contained, offline-first match-3 game in the garden-puzzler genre
(Gardenscapes-style meta, size-tiered explosives). Everything lives in
 `index.html` — engine, procedurally painted sprites, UI, levels, audio, and
meta systems — with zero dependencies and zero image assets. This document
maps the code so you can experiment with new features quickly.

## Files

| File | Purpose |
|---|---|
|  `index.html` | The entire game (CSS + HTML shells + one `<script>`) |
| `sw.js` | Offline cache (bump `CACHE` version on every release) |
| `manifest.webmanifest` | PWA install metadata |
| `icon.svg`, `apple-touch-icon.png` | App icons (PNG required for iOS) |

## Engine concepts

- **Grid**: `G.grid[r][c]` holds piece objects or `null`; `G.playable[r][c]`
  marks holes; `G.dirt[r][c]` marks dirt tiles. Piece flags:
  `kind` (one of `KINDS`), `power` (`fire|bomb|dyna|tnt|rainbow`),
  `block` (+`hp`), `gnome`, `vine`. A piece with `kind: null` never matches.
- **Match analysis** (`analyzeMatches`): finds runs ≥3, merges runs sharing a
  cell (L/T/+ shapes), and sizes the merged group. Group size → power-up:
  4 = firecracker (3×3), 5 = bomb (5×5), 6 = dynamite (7×7), 7+ = TNT (9×9)
  — see `powerForSize` and `POWERS`.
- **Destruction** (`expandDestroy` → `destroyCells`): BFS chain — a destroyed
  power-up enqueues its blast area; rainbow orbs enqueue every piece of a
  goal-aware kind (`rainbowTargetKind`). Gnomes are skipped (blast-immune).
  Adjacent ice/vines are cracked by any destruction. Two-layer ice loses one
  `hp` per hit.
- **Gravity** (`applyGravity`): per-column compaction; everything falls,
  including gnomes/vines/blocks. Refills spawn via `spawnKind()`, which leans
  18% toward kinds the player still needs ("managed randomness").
- **Resolve loop** (`resolveCascades`): destroy → gravity → settle gnomes →
  repeat until stable, with an escalating score multiplier. `afterMove` then
  handles vine spreading, rainbow-wheel spawning, win/lose, and deadlock
  reshuffles.
- **Rainbow wheel**: `G.charge` rises with every destroyed piece;
  `CHARGE_MAX` (60) drops a Rainbow Orb on a random normal piece.
  Orb swaps: with a normal piece = clear that kind; with a power-up =
  full-board storm; tap = clear the most-needed kind.
- **Shovel**: `G.shovels` (3/level) → `digCell` destroys any tile at no move
  cost.

## Meta systems

- **Stars as currency**: `starsEarnedTotal() - save.spent` is the wallet.
  `TASKS` (12 entries) drive the restoration meta; completing one advances
  the Day counter and restores a landmark on the map. Butler lines live on
  each task.
- **Retention**: win streak (`save.streak`) pre-places boosters at 3/5/7
  wins; soft pity adds +2 moves per 3 fails (`save.fails`); daily gifts
  escalate over consecutive days (`checkDaily`, `DAILY_GIFTS`); Bloom Burst
  converts leftover moves into detonating firecrackers; Super Bloom fires on
  exact-last-move wins.

## Levels

`LEVELS` is an array of `{ moves, colors, mask, goals, hard? }`.
Mask characters: `.` playable · `X` hole · `J` dirt · `B` ice ·
`D` two-layer ice · `G` gnome · `V` vine seed.
Goals: `{type:'kind', kind, count}` explicitly; `dirt`, `block`, `gnome`,
`vine` goals are auto-added from the mask. **Rule: every goal kind's index in
`KINDS` must be `< colors`, or the goal can never spawn** (this bug shipped
once — audit with the snippet in the tests section).

Star thresholds derive from `moves * 260 + index * 900` — tune per level by
overriding `starScores`.

## Sprites

All bitmaps are canvas-baked at boot (`bake(paintFn)` → 256px PNG data URL in
`SPRITES`). `shadeBody` gives any `Path2D` silhouette the house look: radial
volume gradient, bottom ambient occlusion, top sheen, offset rim light, dark
outline; add `specBlob` highlights on top. To add a piece: paint function →
`bake` entry → add to `KINDS`/`KIND_HUE` (order matters — see the rule above).
No `ctx.filter` anywhere (iOS Safari compatibility).

## Tuning knobs

| Constant | Meaning | Default |
|---|---|---|
| `CHARGE_MAX` | pieces destroyed to fill the rainbow wheel | 60 |
| `powerForSize` | match-size → power tier ladder | 4/5/6/7+ |
| spread rate | one vine per uncut move (`afterMove`) | 1 |
| `G.shovels` | shovel charges per level | 3 |
| soft pity | `+2 moves per 3 fails, cap +4` (`prepareLevel`) | |
| streak tiers | boosters at 3/5/7 wins (`prepareLevel`) | |
| hit-stop | 80ms (bomb/dyna), 140ms (TNT+) in `resolveCascades` | |

## Test hooks

`window.__test` exposes: `openLevel, startLevel, trySwap, activatePower,
digCell, findAnyMove, spreadVine, liveVines, collectGnomesOnce, settleGnomes,
applyGravity, state(), save(), levels, isBusy()`. Drive it headless with
Playwright at a 390×844 viewport; the repo's history has ready-made
auto-play and per-mechanic test scripts in the session scratchpad pattern.

Level audit snippet (run in the console): every level's kind-goals must
satisfy `KINDS.indexOf(g.kind) < L.colors`.

## Release checklist

1. Bump `CACHE` in `sw.js`.
2. Headless smoke: auto-play a win and a loss, plant each power tier, check
   `document.querySelectorAll('.part,.ring,.rays,.fly').length === 0` after
   play and zero console errors.
3. Deploy = merge to `main` (Vercel serves the repo root at aleville.vercel.app).
