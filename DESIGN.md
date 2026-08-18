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

## Third-party assets

- **Kenney.nl** (CC0 / public domain, no attribution required — kept here as a courtesy):
  UI Pack (button 9-slices), Interface Sounds + Digital Audio (embedded OGG samples),
  Particle Pack (star/spark/magic/light textures). All embedded as base64.
- **GSAP 3.15** (GreenSock/Webflow standard no-charge license) — inlined; drives the
  fly-to-goal arcs, toast pops, win score counter, and task-board pulses.
  Board-piece physics deliberately stay on CSS transforms — never point GSAP at
  `.candy` elements or the two systems will fight over `transform`.

## Pipo

The mascot penguin (teal body, white belly, yellow feet/beak — ported from the
original canvas drawing) is baked as `SPRITES.pipop` via `paintPipo`. He
stands on the current map node (`.pipop-av`, bobbing), and when new levels
unlock, `renderMap` walks him node-by-node along the path with a GSAP timeline
(waddle rotation on the inner img, movement on the wrapper — never both on one
element), finishing with a heart burst. `save.pipopAt` tracks the node he was
last seen on. Cameos: splash screen, story intro, win screen.


## Pipoville cast & rescue plot

`CHARACTERS` is a vector registry of all 16 inhabitants (ported from the
original character engine); each is baked to `SPRITES.c_<id>`. `RESCUES`
maps level number → captured friend: beating that level plays a rescue
cutscene (`ov-rescue`), frees the character on the map (caged silhouette →
bobbing friend), and may grant a companion perk — Cannolio +1 shovel,
Nunu +2 moves on hard levels, Ms Toni wheel fills at 50, Ms MooMoo daily
gift tier up, Pancione streak bomb. `CHAPTERS` labels map zones. In-level,
`#pipop-side` stands under the board; `setPipoMood(mood, holdMs)` drives
reactions (cheer/worry/sad/no/party) with an emote bubble, reverting to a
moves-aware baseline.

## Localization (i18n)

The game ships in English and Italian. `LANG` is resolved from
`save.lang` at boot ('en' default); the splash screen renders a
language picker (`.lang-btn`) that persists the choice and reloads.
Mechanics, keyed by exact English string:

- `IT` — exact-match dictionary EN → IT. Static DOM text is swapped
  once at boot by a TreeWalker over body text nodes (scripts/styles
  skipped), so markup never needs `data-i18n` attributes.
- `t(s)` — wrap any whole dynamic string (`toast(t('Shuffled!'))`).
- `tf(en, it)` — template strings with interpolation (both variants
  written out at the call site).
- `IT_TASK_DONE` — Italian task-completion banners (the English path
  conjugates verbs with a regex, which doesn't translate).
- Data tables (`RESCUES`, `TASKS`, `CHAPTERS`, `DAILY_GIFTS`) wrap
  their strings in `t()` at definition time, so they resolve once.

Rules: character names (Pipo, Nunu, Whaeleeno, ...) are NEVER
translated. New user-facing strings must be added to `IT` (exact
match) or written with `tf()`. Inside `doTask`/`renderTasks` the local
task variable shadows `t` — don't call the translator there.

## Toy-plastic redesign & mail-run meta (design handoff)

The chrome follows the "soft toy-plastic" design system from the Pipoville
design handoff: every raised surface is the plastic recipe (top gloss inset,
hard offset edge, contact shadow — no texture), sky/ground gradient
background, Baloo 2 type, and the postal-blue/grass-green/amber/stamp-red
button ramps. Kenney 9-slice buttons and all emoji chrome are replaced by
nine canvas-baked icons (`ICONS`: heart, stamp, letter, mailbox, medal,
gift, quest, spade, clock) painted through the same `shadeBody()` pass as
the pieces.

Cast art is the chibi sheet (`CAST_META`, base64-inlined ~226KB); it
overrides `SPRITES['c_*']`/`SPRITES.pipop` in `bakeAll`, and each character
carries a signature idle loop (waddleIdle, waggle, prance, breathe, sniff,
sneak...). `CHARACTERS` keeps names and dialogue.

Meta loop: **Mail Stamps** are the wallet (`save.stamps`, earned per level
via `G.runStamps` = destroyed/3 capped at 24; existing saves seed at
unspent stars × 8); stars are demoted to per-level medals. **Hearts**
(`save.hearts`, cap 5, one per level start from the sheet, +1 per 30 min,
retry/restart free, ★8 refill). **Daily quests** (`QUEST_DEFS`, progress in
`save.quests`), **stamp book** (met = base four + `save.rescued`), **shop**
(hearts refill / booster packs into `save.pending` / cosmetic cap), and the
**mailroom** (the old task board, costs = `cost × 8` stamps). Five-tab
bottom nav + hearts/stamps top bar show on meta views only
(`body.in-meta`, `META_VIEWS`). Level entry is a bottom sheet with booster
arming (`G.armed`, fire ★3 / bomb ★5 / spade ★2).

The match-3 engine, obstacles, rainbow wheel, shovel, rescue plot, i18n and
PWA setup are unchanged. All new UI strings go through `tf(en, it)`.

## Honey, chains, landmarks, cutscenes

Two positional blockers joined the mask language: `H` = honey (a jelly
layer *under* the piece — cleared when the piece standing on it is
destroyed; auto-goal `jelly`, pink glossy cell tint) and `C` = chained
piece (a normal piece wrapped in chains: can't be swapped or proposed as
a move; any match or blast that hits it snaps the chain instead of
destroying it — auto-goal `lock`, `SPRITES.chain` overlay). Both hook
into `destroyCells`, the single destruction chokepoint. Vines never
spread onto chained pieces; shuffles leave them in place.

Completed mailroom tasks now build plastic **landmark cards** along the
route map (the next unbuilt task shows as a dashed ghost with its ★
cost); `save.landmarksSeen` triggers a pop animation the first time each
new landmark appears.

**Chapter-end cutscenes** (`CHAPTER_SCENES`, levels 8/16/24/30/40/50)
reuse the intro dialogue player via `startScene(script, onDone)`; they
chain between the rescue modal and the win card, play once
(`save.scenes`), and are fully bilingual. `window.__test.winSequence`
is exposed for deterministic end-of-level testing.

## Honey layers, the +5 offer, replays

Mask `K` = two-layer honey (deeper tint via `.jelly2`; each clear on
top removes one layer; `jellyTotal` counts layers). The lose card shows
a **+5 moves · ★12** offer on near-misses (≥70% done or ≤6 goal items
left); buying it undoes the loss bookkeeping (`G.lossUndo` restores the
streak and fail count), resets the flushed quest counters, and resumes
the round. Completed non-current map nodes carry a `replay-badge`
(baked `ICONS.replay` circular arrow) and the level sheet shows a
`Record` line from `save.best` (per-level best score, written in
`winSequence`).

## The big seven (v21)

- **Rainbow tier**: `powerForSize` returns 'rainbow' for 9+ merged
  matches — the wheel orb, craftable on the board.
- **Chapters 7-8**: levels 51-70 (Whaeleeno's Reef, The Deep), story
  continues underwater; scenes at 50 (rewritten hook), 60, 70.
- **Music moods**: `Music.MOODS` — one scale/tempo/voice/bass per
  chapter, switched by `Music.setMood(chapterFor(level))` in
  prepareLevel. `Snd.squelch()` / `Snd.chainSnap()` for the blockers.
- **Reaction poses**: cheerPose/slumpPose keyframes; cutscene portraits
  animate with each character's CAST_META idle.
- **Fog Race** (`EVENT_TIERS`, `eventLevels()`, `save.event`): Fri-Sun,
  three deterministic level picks from the unlocked range (seeded by
  the Friday date), best-score sum vs three prize tiers, rendered atop
  the Round view; weekday teaser with countdown.
- **Cosmetics** (`COSMETICS`, `save.cosmetics`): cap/scarf/sailor
  painted onto the chibi Pipo via canvas composite (`applyCosmetic`),
  shown everywhere Pipo appears; buy/wear/worn cycle in the shop.
  Legacy `save.cap` migrates.
- **Share cards**: `buildShareCard()` renders a 1080×1350 PNG (logo,
  chapter, medals, score, Pipo with cosmetic); `shareWin()` uses
  navigator.share with download fallback; `G.lastWin` captured in
  winSequence.

## The town is the point (v22)

The Mailroom tab is now **Town**: an illustrated diorama (`#town-scene`,
`TOWN_SPOTS` positions) where each completed task visibly builds its
structure in place, with the next project shown as a priced ghost and
Pipo standing in the square. **Wave 2** — twelve town projects
(school bell, bakery, post office, pier, lighthouse, ferris wheel...) —
unlocks when the twelve garden projects are done. Every built structure
yields its cost in **daily stamp income** (`townIncome()`, collected
once per day via `save.townDay`), making building an investment, not a
sink. Task rows state their wave and yield.

**Character depth**: album slots open a story card (`CAST_LORE`
backstories EN+IT, `CAST_PERKS`, rescue chapter via `rescueLevelOf`).
**Friends' wardrobe** (`WARDROBE`, `save.wardrobe` — migrates
`save.cosmetics`): accessories for Cannolio (bandana), Ninni (flower
crown), Winnie (bow), and Whaeleeno (keeper cap) composite onto their
chibi sprites via `drawFriendAccessory` and render everywhere,
including story cards. Shop shows only met friends' items.

## v24 — Geometry audit + graphics quality pass

A programmatic layout auditor (Playwright, 3 viewports × ~20 UI states) sweeps
every pair of visible text-bearing elements for unexpected intersections,
whitelisting intentional stacks (badges, diorama collage, floating toast).
Everything it caught is fixed:

- **Bottom nav is full-bleed and fully opaque.** The floating bar left a
  see-through gap at the screen edges and its 95%-alpha gradient let row text
  ghost through. Now `left/right/bottom:0`, rounded top corners only, solid
  gradient. `#route-hint` got the same opacity treatment.
- **Town build banner** (`.map-banner`) now drops in over the diorama
  (`top:178px`) instead of covering the view header text.
- **Caged/freed friends on the map** stand clear of level nodes: offset 62→74px,
  side flips toward the screen centre near the map edges, and nodes paint above
  friends (`.lvl-holder z-index:3`, `.friend z-index:1`).
- **Win/story portraits** no longer bob into their titles (margin bumps).

Graphics quality: the chibi cast PNGs are 74–98px natives shown at up to
~450 device px. `upscaleCast()` now resamples each once at boot to 256px via
stepped 2× draws with `imageSmoothingQuality:'high'`, then applies a mild
premultiplied unsharp mask (`sharpenCanvas`, k=.22) so contours stay defined.
Every later scale is a downscale — crisp — instead of the browser's cheap
bilinear upscale. `applyCosmetic()` composites at high smoothing quality from
the already-upscaled base.

Audit lives at `scratchpad/audit-geometry2.js`; keep it green when touching CSS.


## v25 — HD cast, living map, cloud saves

**HD character art.** The 74–98px chibi PNGs are gone: each was upscaled 4×
offline with Real-ESRGAN (anime-6B, official weights, dual-matte alpha
recovery so transparency survives), quantized with pngquant, and re-embedded
(~593KB for 15 characters). Accessories now composite at the art's native
resolution, and every cosmetic was re-seated against a measured coordinate
grid (glasses on the eyes, scarf at the neck, Cannolio's bandana a proper
neck kerchief, Ninni's flowers on her head, Winnie's bow a real bow).
The asset pipeline lives in `scratchpad/upscale.py`.

**Map.** A `.map-terrain` SVG paints per-chapter tint bands (stops emitted
top-down — SVG gradients need ascending offsets), edge hills, three meander
rivers, and seeded flora. Fog-of-war: everything past `unlocked + 2` hides
under drifting `.fog-puff` clouds — nodes, cages, landmarks and chapter
signs all respect `visLimit`; only the trail teases through.

**Cloud saves ("codice famiglia").** No accounts, no PII: Settings can mint
a `PIPO-XXXX-XXXX-XXXX` code (crypto-random, ~60 bits) that doubles as the
credential. Supabase backend (project jclbcymquzpkylscldff, isolated
`pipoville` schema, deny-all RLS) exposes exactly two SECURITY DEFINER RPCs:
`pipoville_store(code, jsonb)` and `pipoville_load(code)`. Every `persist()`
schedules a debounced (2.5s) push; boot adopts the server copy when another
device pushed a newer one; entering the code on a fresh device restores
everything. All UI strings via `tf()`.


## v26 — Version control: updates never cost progress

Two version numbers, one contract:
- `GAME_VERSION` (release number, mirrors the sw.js `CACHE` suffix — bump
  both on every ship). Shown in Settings; drives the one-time
  "updated to vN, your town is intact" banner via `save.seenVersion`.
- `SAVE_VERSION` (save schema). Bump ONLY when the save shape changes, and
  add a step to the `migrateSave()` chain. Before any migration runs, the
  untouched save is snapshotted to `candy_garden_save_v1_bak_v{N}` — no
  update can destroy progress. Saves written by a NEWER app are never
  rewritten downward.

Cloud sync is version-aware: incoming saves are migrated on arrival; a save
from a newer app is refused at join (with guidance to update first) and
skipped at boot adoption.

Update flow: sw.js already `skipWaiting()`s; the page now listens for
`controllerchange` and reloads once so the fresh version is what's on
screen. Settings has "Cerca aggiornamenti" (`registration.update()`), and
the version label. Save data lives in localStorage and the SW never touches
it.

Shipping checklist: bump `CACHE` in sw.js + `GAME_VERSION`; if the save
shape changed, bump `SAVE_VERSION` + extend `migrateSave()`; run
`audit-geometry2.js`, `test-redesign.js`, `test-version.js`.
