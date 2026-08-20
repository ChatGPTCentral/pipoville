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


## v27 — Daily Delight (retention layer, part 1)

The first release of the bestseller roadmap: four kid-safe retention systems.

- **Stamp Chest** (`gainStamps()`, `CHEST_NEED` 120, `CHEST_BONUS` 20): every
  stamp earned anywhere (wins, quests, events, town income, minigame) also
  fills `save.chest`; at 120 it opens ITSELF — +20 stamps and a rotating
  booster — with a banner + confetti wherever the player is. All raw
  `save.stamps +=` gain sites now route through `gainStamps()`; keep it that
  way. Spending still goes through `spendStamps()` (spending never drains
  the chest).
- **Welcome-back letter** (`checkWelcomeBack()`, `save.lastSeen`): ≥3 days
  away → warm letter, hearts refilled, up to 3 days of town income, a Bomb.
  The daily-gift ladder never resets on a lapse anymore — it resumes at the
  same tier (`checkDaily` grace).
- **Letter of the Day** (`ensureLotd()`, `save.lotd`): one seeded level per
  day; the first win pays double stamps (💌×2 on the win pill). Card in the
  Giro view.
- **"Chi si nasconde?"** (`openCritters()`, `save.critters`): daily
  hidden-object round in the town diorama — 5 critters (butterfly, gnome,
  jelly, Cannolio, Baggu) at day-seeded positions, 90s soft timer (no fail:
  timer only gates the Firecracker speed bonus), +8 stamps. Daily streak
  shrinks critters and hides them behind buildings. Entries: win screen 🔍
  button (until played) and a card in the Città view. Exiting hands back the
  win modal when it came from one.

Save fields are additive (chest/lotd/critters/lastSeen default at runtime) —
SAVE_VERSION stays 2, no migration needed.


## v28 — The City of Pipoville

The Gardenscapes-style town, kept true to the game's zero-image-asset
philosophy: all 24 landmark buildings are **canvas-painted isometric
sprites** (`TOWN_PAINT` — box/gable/cone/cylinder primitives with a
sticker outline, baked at 256px into `TOWN_SPRITES` at boot; iterate with
`scratchpad/shot-town.js`'s contact sheet).

`#ov-city` is a full-screen overlay: a 1500×1150 pannable world
(`#city-scroll` native two-axis scroll) with an SVG ground layer (sandy
trail through the main squares, seeded flora), day/night tint
(`cityTint()` by hour), and `.city-el` sprites placed via `cityXY()`
(a direct scale-up of `TOWN_SPOTS`, z-sorted by y). The next project
renders as a greyscale ghost with its ★cost: tapping it **builds in
place** (`doTask` + pop-in + bubble) when affordable, wiggles with a
kind hint when not.

**Friends live there**: every rescued character strolls at a day-seeded
spot; the first tap each day pays +2 stamps (`save.friendGifts`), later
taps share a line of their lore. Pipo stands by the fountain and opens
the dressing room. Entry: the "Passeggia per Pipoville" row in the Città
view (the small diorama stays — the hidden-critters minigame uses it).

**Stacking-context fix worth remembering**: `.screen` now sets
`isolation:isolate`, `.overlay` z-index is 60 (above meta chrome), and
`#confetti-layer` 80. Before this, the diorama's z-indexed children bled
through any overlay opened above the mailroom.


## v29 — The city, properly painted

v28 proved the city works; v29 makes it look like a game rather than a
diagram. Everything is still canvas-painted at runtime — no image assets.

**Lighting model.** One sun, top-left-front, applied consistently by the
primitives in `TOWN_PAINT`: `gradFace()` gives every wall a vertical
gradient (light at the top, ambient occlusion pooling at the base), tops
are brightest, right-hand walls fall into shadow, and a warm rim
(`rgba(255,248,210,.55)`) is stroked along the two edges that catch the
light. `shadow()` lays a real radial contact shadow instead of a flat
ellipse.

**Material detail.** `gable({tiles:true})` draws shingle courses,
`box({brick:true})` draws brick courses, `panel({glass, mullion, sill})`
gives windows a frame, cross-bars and a warm glow at the sill, and
`awning()` builds a striped, scalloped canopy that slopes out from the
wall plane. Flower boxes, bunting, deck planks, cobble joints, lamp
glows and water shimmer are painted per building.

**Resolution.** Town sprites bake at 512px (scenery 256) — matched to a
3x phone showing a 140px building — and are baked **lazily** by
`townSprite()` the first time the city opens, so the boot path is
untouched.

**Terrain.** `paintCityGround()` paints the whole 1500x1150 floor into a
canvas layer: grass with tonal meadow patches, a harbour bay anchored
under the pier lot (wet-sand rim + shimmer), a cobbled plaza around the
fountain with fanned setts, tilled garden beds under the growing lots, a
sandy road threading the main squares, ~260 scattered tufts/daisies/
pebbles, and a vignette so it reads as a diorama.

**Life.** 34 seeded scenery sprites (trees, pines, bushes, planters,
hedges, rocks) keep clear of the lots; butterflies and bees drift over
the meadow; once the lanterns are built and the hour is late, `.dusk`
fades in warm pools of light under the lamps, carousel and lighthouse.

**Audit note.** `audit-geometry2.js` is now clipping-aware — an element
scrolled outside its clipping ancestor counts as off-screen — which is
what a pannable world needs to be checked honestly.


## v30 — A city that moves, breathes and follows the calendar

**Animation.** `TOWN_PAINT.carousel` and `.ferris` take a phase argument, so
`townFrames(id)` bakes an 8-frame strip per ride and one shared 130ms timer
(`startCityAnim` / `stopCityAnim`, tied to the overlay's lifecycle) swaps
`.anim-ride` sources. Flags are now baked **pole-only** (`POLE_ONLY` in the
painter) and the cloth is a CSS `.flag-cloth` pinned at `FLAG_ANCHORS[id]`
— coordinates in the sprite's own 0..100 space, which map directly to
percentages of the `<img>` box. The house's chimney smokes via
`.chimney-smoke`, and five `.cloud-shadow` ellipses drift over the ground.

**Seasons.** `citySeason()` reads the real month: winter (Dec–Feb), spring
(Mar–May), summer (Jun–Sep), autumn (Oct–Nov). Each stamps `sp-<season>` on
`#city-world`, which grades the ground canvas with CSS filters, chooses the
falling particles (`SEASON_FALL`: petals, none, leaves, snow) and picks the
wildlife (no butterflies in the snow — doves and robins instead). Winter
adds `#city-frost`, a cold wash over the whole town.

**Camera.** `setCityZoom(z, cx, cy)` scales `#city-world` inside a
`#city-sizer` whose size grows with the zoom, so the scrollable area stays
correct, and it re-anchors the scroll so the point under the fingers stays
put. Driven by pinch (two pointers on `#city-scroll`), double-tap (ignored
when the tap lands on a building, friend or button, so building still
works), and the `+` / `−` buttons in the header. Zoom resets on open.

All of it honours `prefers-reduced-motion`.

## v31 — one world: the map *is* Pipoville

Until v30 the game had two places: a route map with level nodes, and a
separate city you opened from the town list. They told the same story
twice. v31 merges them. There is now exactly one world, and every chapter
is a **district** of it.

**The data model.** `DISTRICTS` names eight districts, each with a level
range, a centre in world pixels, and the three restoration projects that
stand there. `districtOf(level)` maps a delivery to its district;
`districtReached()` is the newest one the player has walked into;
`districtDiscovered(i)` gates everything else. A project is only offered
once its district is reached — `taskUnlocked(id)` drives the town list, the
mailroom filter and the ghost buildings alike, so the restoration order now
follows the journey instead of a flat list.

**The lane.** `worldTrail()` builds one continuous path for the whole town:
a centripetal Catmull-Rom spline through every district centre, given a
slow meander (`TRAIL_WAVE` / `TRAIL_SWING`), then **cut into stops by arc
length** — `LEVELS.length` points at an even walking distance along the
finished curve. Spacing therefore does not depend on how many levels a
district holds, and no two nodes can crowd each other (the world test
asserts the minimum pairwise gap). `trailNormal(i)` gives the sideways
direction at a stop, used to stand caged friends at the roadside.

**The lots.** `solveLots()` places each district's three projects along the
lane rather than at fixed offsets: it takes the district's mid stop, reads
the street's overall heading (a wide window, not the local wobble), lays the
three lots out along that heading and set back from the kerb, and picks
whichever side of the road keeps them in bounds and furthest from the lane.
A short repulsion pass then nudges any lot the meander still runs too close
to. The town square and the tilled fields are painted from the solved lots,
so they land in front of the shops and beside the farm — never on the road.

**The shore.** The sea is no longer a hand-drawn polygon. `paintWorldGround`
walks a baseline from the right edge to the top and pushes each shore point
seaward until it clears every stop and every lot by 260px, so the coastline
hugs the harbour and lighthouse districts without ever flooding the lane.

**The floor.** `paintWorldGround()` renders the whole 3600×2560 world once
into a canvas: grass gradient, meadow patches, sea and beach, the town
square, tilled fields, the lane itself drawn **along the trail** (so the
road and the level nodes are the same line), ~800 ground details and a
vignette. `renderWorldGround()` sizes `#city-world` and `#city-sizer` from
`WORLD_W`/`WORLD_H`, so the town can grow without touching CSS.

**The render.** `renderMap()` is the single renderer: ground, sky, tint,
then district signs, a `.fog-bank` over the *next* district only, the built
and ghosted projects on their lots, every level node on its stop, scenery
inside the reached districts, open country between them, lamplight, rescued
friends and Pipo standing at his next delivery. `openCity(id)` is now a thin
shim onto the map screen plus `focusWorld(id)`, which pans the camera to a
level number or a project id. Leaving the map stops the ride timer.

**Chrome over the world.** With the map and the city merged, `#map` no
longer reserves 86px of dead screen at the bottom — the world runs to the
edge and the bottom bar floats over it, Gardenscapes-style. `#city-scroll`
now carries `isolation:isolate` so a tree's depth-sorted `z-index` can
never paint over the zoom buttons or the route hint. Nav tabs cap at 104px
and spread with `space-evenly`, so on a tablet the active tab is still a
pill and not a slab; the label colour was darkened for contrast and the bar
picked up a lift shadow. The chapter block in the header is `flex:1` with
`min-width:0` and a two-line clamp, so a long chapter name can never shove
the settings button off the edge.

**Where the camera lands.** `renderMap()` ends by centring on the player's
current delivery (`focusWorld(cur)`) unless called with `{keepCamera:true}`
— which the build-on-the-map handler does, so placing a building doesn't
yank the view away from it. `fitCityZoom()` picks the opening zoom from the
viewport (about 480 world px across, clamped to 0.7–1.0) so you arrive
looking at your street rather than at a single node, and `focusWorld()`
offsets for the floating nav bar so the target sits in the visible middle.

## v32 — the town, properly rendered

v31 made Pipoville one place. v32 makes it look like one. The whole
`TOWN_PAINT` primitive layer was rewritten around a single lighting model,
so every roof, wall, lamp and tree agrees about where the sun is — which is
most of what makes a flat canvas read as a solid object.

**One sun.** `SUN` holds the multipliers for the left wall, the right wall
and the roof deck, top and bottom. `tone(hex, f, warm)` shades a colour and
pushes it toward warm sunlight or cool sky-shadow; `hx()` does the same but
returns hex, so a result can be shaded again (the old `sh()` returned
`rgb()` and quietly produced black when re-shaded — that was the bug behind
the pitch-dark bushes).

**Parametric faces.** `box()` now hands every face its own projector
`q(u, v)` in wall coordinates. Materials, ambient occlusion and openings are
all placed in that space, so courses run along the wall in world terms and
the isometric foreshortening comes out for free.

**Materials.** `MAT.brick` lays staggered courses with a mortar bed and a
per-brick tint plus a few weathered patches; `MAT.stone` cuts irregular
ashlar with a lit top arris; `MAT.plank` runs vertical boards with seams,
lit lips and grain streaks; `MAT.plaster` is a diagonal wash with mottling
and grain. Pass `mat:'stone'` to `box()`, or `{ mat:'stone' }` to
`cylBody()` for a coursed drum (the manor towers, the lighthouse).

**Ambient occlusion.** `ao(q, uMax, vMax, side, depth, alpha)` stacks quads
along one edge of a parametric face so the shade follows the plane instead
of sliding off it the way a screen-space gradient would. Every wall gets it
at the ground line and at the inside corner; every roof slope gets it at
the eaves.

**Roofs.** `gable()` overhangs by `eave`, lays 11 courses of tile with a
hard shadow lip and a lit lip per course, caps the ridge, and drops the
eaves' own shadow onto the wall below. `cone()` gets tile rings.

**Windows.** `panel({glass:true})` is a hole in a wall, not a sticker: a
dark reveal, sky at the top of the pane, room-warmth at the sill, a rotated
specular streak across it, and a sill with its own drip shadow.
`panel({door:true})` gets recessed panels.

**Water.** `water(cx, cy, rx, ry)` paints depth (dark at the far bank,
bright where it shallows), the sky lying on the surface, caustic threads,
shade hugging the far bank, and foam at the waterline. Used by the pond,
the harbour under the pier and the stream under the bridge.

**Foliage.** `canopy()` builds a crown from eight lobes: the whole
silhouette in shadow first, then lit lobes, then sun-struck clumps and dark
gaps clipped to that silhouette, then a warm rim where light comes through
the far leaves. `conifer()` gives each pine tier a needled skirt;
`trunk()` adds bark relief and roots flaring into the ground.

**Ground contact.** `shadow()` is now two pools — a wide soft ambient one
and a tighter, darker one thrown away from the sun — and it clamps itself
so it can never be clipped by the bottom of the sprite (a clipped gradient
reads as a hard black band under a building).

**Plinths and rainwater goods.** `box({plinth})` adds a proud base course;
`gutter()` runs a gutter along the eaves and drops a downpipe to the
ground. Small things, but they are what make a shape read as a building
instead of a block.

**The land.** `paintWorldGround()` now lays two octaves of soft rises and
hollows before anything else is drawn, so the map has relief; adds faint
mown bands; runs the road as five stacked strokes (verge, gravel shoulder,
body, worn crown) with two wheel tracks and grit; and scatters 1400 pieces
of ground cover — clumps of blades with a shaded base and one sunlit blade,
daisies, clover, pebbles with lit tops and their own contact shadows.

Baking all 30 sprites costs ~210ms and the ground ~50ms on desktop, both
lazy and one-off.

## v33 — the diorama is gone; the hunt moved outdoors

The Town tab still carried a small illustrated diorama from v28 — a second,
lesser Pipoville drawn in emoji, kept alive only because the daily
hidden-critters round used it as a playfield. With the map and the city
merged, that diorama was the last place the game told its story twice. It
is now deleted: `#town-scene`, `.town-el`, `.town-sun`, `.town-pipo` and
`renderTownScene()` are all gone, and `TOWN_SPOTS` — whose x/y were only
ever the diorama's layout — collapsed to `TOWN_SIZE`, the one value the
world actually reads.

**The hunt runs in the real town.** `openCritters()` no longer opens a
modal over a mini-scene. It switches to the map, stamps `hunting` on
`<body>`, and hides five critters in the world itself as `.find-critter`
children of `#city-world`, positioned in world pixels. The player pans and
zooms the actual Pipoville to find them, so knowing your own town is what
makes you fast at it.

`critterSpots()` picks the hiding places from the part of town the player
has walked: every delivery stop in a discovered district plus every project
already built there. It samples 40 candidates per critter and keeps the one
furthest from those already placed, so the five spread across the map
rather than clustering (the test asserts the minimum gap). Positions are
seeded from the day, so everyone hunting today hunts the same town.

**The chrome is a docked bar, not a modal.** `#find-bar` sits where the nav
bar was — `body.hunting` hides `#meta-nav`, `#route-hint` and the zoom
buttons, and makes level nodes, buildings, friends and Pipo `pointer-events:
none`, so during the hunt the town is scenery and only the critters take a
tap. The streak still tightens the game: each day they hide smaller, and
past a streak of 3 they hide *behind* the scenery (`z-index` below the
depth-sorted world instead of above it).

**Cleanup is centralised.** `endHunt()` clears the timer, drops the class
and removes the critters; it is called on finish, on close, and from
`showScreen()` whenever the player leaves the map — so a hunt can never
leak a running interval or a stray critter into another view. `renderMap()`
deliberately spares `.find-critter` when it clears the world, and skips its
usual camera re-centring while a hunt is on.

**The Town tab is now the ledger.** No scene, just what it is for: the
hunt, a "go and see the *thing you last built*" row that walks the camera
there, the daily post income, and the project list.

## v34 — the cast, lit like the town

After v32 the buildings were painted under one sun and the characters were
not, which made a lovingly rendered town with fifteen stickers walking
around in it. The cast art is raster (a design handoff, base64-inlined), so
repainting fifteen characters was never the answer. Instead we **relight**
them at boot: every layer is derived from the art's own alpha, so it costs
no new bytes and it obeys exactly the same sun as `TOWN_PAINT`.

`relightSprite(img)` runs six passes on a canvas the size of the source:

1. **Grade** — `saturate(1.1) contrast(1.05)` on the base. Flat fills read
   as paper next to a rendered building; a small grade is most of the fix.
2. **Form shadow** — a radial ramp anchored at the upper-left light,
   `source-atop` so it only touches the silhouette. Warm-grey rather than
   blue, or white bellies go cold.
3. **Bounce** — a warm pool rising from below, the light the ground kicks
   back up.
4. **Contact shade** — a gradient in the bottom fifth of the silhouette.
5. **Rim light** — the silhouette minus itself shifted away from the sun,
   blurred and added with `lighter`. The silhouette is **eroded by a pixel
   first**: without that the highlight lands on the anti-aliased outer edge
   and reads as a white halo instead of as light.
6. **Keyline grade** — the cast art carries a white sticker keyline the
   painted town never has. The outer band (silhouette minus silhouette
   eroded by 2.6%) is multiplied by a diagonal ramp from white to warm tan,
   so the keyline stays bright where the sun hits it and drops away warm in
   the shade.

The result is encoded as **WebP** (`toDataURL('image/webp', .94)`, falling
back to PNG when a browser cannot encode it): the relit art is 639KB in
memory versus 2.5MB as PNG, and about the same as the flat originals.

`relightCast()` walks the cast **one character per animation frame** — the
whole pass is a few hundred milliseconds of canvas work and doing it in one
block would drop a visible run of frames. Each finished character updates
`CAST_META[k].src`, `SPRITES['c_' + k]`, `SPRITES.pipop` and any `.char-img`
already on screen, and `applyCosmetic()` re-runs at the end so hats
composite over the relit base rather than the flat one.

**Footing.** A character standing in the world now gets the same two-pool
contact shadow the buildings are painted with — a wide ambient pool plus a
tighter one thrown away from the sun — as `::before`/`::after` on
`.city-friend`, `.city-pipo` and `.friend.freed`. Without it they float.
They also join the seasonal grade: winter desaturates them along with the
town, autumn warms them.

Resolution was never the problem, and we checked rather than assumed: at 3×
device pixels every context renders the cast at a ratio of 1.76–3.3 source
pixels per device pixel. Upscaling would have made them softer, not sharper.

## v35 — the board, properly rendered

The town got its materials in v32 and the cast got its light in v34. The
pieces are what the player actually stares at for a whole round, so they
went last and they went furthest.

**`shadeBody()` v2.** The shared pass now models a real terminator rather
than a linear ramp — `[hi, mid, lo, darkHex(lo, .72)]` — and layers
occlusion at the foot, the warm light the board throws back up, a sky sheen
down the top, a lit rim offset toward the sun and a cool sky-lit edge offset
away from it. `grain()` sprinkles deterministic speckle so a fill is never a
dead flat surface, and `aoInside()` pools shade toward an interior point,
which is what stops petals and wings reading as decals stuck on a body.

Balance mattered more than depth here: the first attempt widened the light
stop and washed every piece out to pastel. Match-3 pieces have to stay
instantly separable by colour at thumbnail size, so the terminator was added
at the dark end only and the sheen pulled back.

**Materials, one per piece.**

- **apple** — waxy streaks running down the fruit, fine lenticel freckles,
  and a shaded well for the stem to sit in. The leaf got a lit midrib.
- **lemon** — citrus peel is pits, not spots: 74 dimples, each a shaded cup
  with a lit lower lip, plus a brighter band round the equator.
- **leaf** — light coming *through* the blade near the lit edge, ribs with a
  dark side and a lit side, and a fine net between them.
- **drop** — actual glass: a bright thread of total internal reflection
  hugging the rim, a refracted horizon band, and the caustic the drop
  focuses onto whatever is beneath it.
- **flower** — petals painted back-to-front so they tuck under each other,
  each with veins and shade where it is rooted; the eye sits in a well and
  throws a shadow out across them; pollen is individual grains with lit tops.
- **butterfly** — wing scales, light passing through the thin outer wing,
  shade where each wing tucks under the body, a furry thorax and antennae
  with club tips.
- **ice / ice2** — internal fracture planes, trapped air bubbles, cracks lit
  on one side and shadowed on the other, frost creeping in from the edges.
  Trapped air is what makes ice read as ice rather than as glass.
- **jelly** — subsurface glow from the middle and suspended bubbles.
- **chain** — forged bar stock: a hard sky/ground split with a bright
  horizon, and each link dropping a shadow on the one behind it.
- **bomb** — sky reflected in the top of the sphere, warm bounce off the
  board along the bottom edge, and cast-iron pitting.
- **rainbow** — a glass dome over the colour wheel, with seams between the
  segments so it reads as an object and not as a pie chart.
- **firecracker / dynamite / TNT** — paper tooth on the wrappers, shade
  where one stick sits behind another, sawn grain and batten shadows on the
  crate.
- **vine** — round runners with a lit top and a shadow beneath, and leaves
  with ribs, veins and their own drop shadows.

Baking all eighteen painters costs 56ms at boot, so none of this is felt.

## v36 — polish pass: chrome, sound ladder, swipe, balance, wardrobe, nav

**HD chrome.** UI icons and buttons moved to the same baked, contact-shadowed
pipeline as the cast and the town. The gear icon in particular went from
teeth parked around a disc to one continuous outline — teeth grow out of the
rim, the bore is a real sunk hole with its own highlight, and the whole cog
shades as a single milled plate.

**Escalating blast ladder.** `BLAST_SND` gives every power tier — firecracker,
bomb, dynamite, TNT, rainbow — its own crack/body/air/sparkle recipe, tuned
so a firecracker pops and a TNT genuinely detonates: louder, longer, a heavier
sub-thump, more sparkle taps, a bigger screen shake (`fxShake` tiers 1–3) and
a longer hit-stop. `Snd.blast(tier)` and `Snd.noise/sweep` are the shared
synthesis primitives everything else in the ladder is built from.

**Swipe to detonate.** A power thrown in a direction now goes off where it
stands, unless the swipe lands on another power — that pairing is worth
more, so it still triggers the combo swap instead.

**Chain-reaction balance.** `spawnKindAt()` replaces the refill spawner:
a landing piece now avoids completing a line most of the time
(`CASCADE_GIFT = .16` is the leash on that), so cascades are the board's
doing again, not a free gift from the RNG. Measured with a scripted bot
(`sim-chain.js`): score-per-move roughly halved across levels 3/12/25,
confirming chains got harder to back into by accident. Star thresholds
moved the other way — `base = moves*230 + i*700`, tiers at `×1`, `×1.42`,
`×1.9` (was `×1.7`, `×2.5`) — a ~35–40% cut to the 3-star bar at matched
move counts, so finishing well now reads as achievable rather than perfect.

**World breathing room.** `renderMap()` now runs every piece of scenery
through a shared `claim()`/`clearAt()` pool before it's placed — level
nodes, task lots, district signs and Pipo's own marker all reserve their
footprint first, and decorative props re-roll their position until they
land clear of everything already claimed.

**Fog covers the whole road, not just the next bend.** The next unlocked
district used to be the only thing under cloud; now every stop beyond the
frontier — and the district after that — sits under an unbroken weather
front, so the unexplored half of the map reads as sky rather than as a gap
mid-route.

**Cast starts undiscovered.** Cannolio, Winnie and Sir Saltbread Cane used
to ship pre-met. `metSet()` now starts with only Pipo; every other
townsfolk — Cannolio included — has to be found on the road first, so the
album and the "who's talking" guide in the route hint never spoil a friend
before you've actually rescued them.

**One shared wardrobe.** Cosmetics used to be nailed to one character each
(Pipo's cap, Cannolio's bandana, ...), and the shop showed the same portrait
thumbnail for every row regardless of what was for sale. `HEAD_ANCHOR` maps
each character's head centre/brow-line/radius (measured off the sprites, not
guessed), so `drawWorn()` can scale-and-translate any painted item onto any
head. `save.wardrobe` is now one `{owned, equipped: {char: kind}}` bag
instead of a map keyed by character, and the shop renders a real baked
preview of each item (`itemIcon()`) instead of the wearer's portrait — so
"Bandana da avventura" actually shows a bandana.

**Nav: City + a Gardenscapes-style level launcher.** The bottom tab that
used to read "Route" is now "City" (it always was the unified map); the old
"Town" tab — which, confusingly, was Italian-labelled "Città" too — is gone
from the tab bar. Its project-list content moved to a small icon button next
to Settings, and in its place the city screen got a round, always-current
level button pinned above the zoom controls: it shows whatever level Pipo is
walking to and opens straight into that level's card on tap.
