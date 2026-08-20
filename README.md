# 🐧 Pipoville

A complete, self-contained match-3 rescue adventure — help Pipo the mail-delivery penguin save his friends from Whaeleeno and Baggu — Gardenscapes-style
meta on top of a size-tiered explosive match-3, built as a single offline
HTML file with zero dependencies and zero image assets (every sprite is
canvas-painted at boot).

**Play:** https://pipoville.vercel.app — on iPhone, open in Safari →
Share → **Add to Home Screen** for the full-screen offline app.

Cloud save: create a **family code** in Settings and your town follows
you on any device — no email, no password, no personal data.

Available in **English and Italiano** — pick your language on the title
screen (character names stay the same in both).

## What's inside

- One world: the quest map **is** Pipoville. 70 deliveries wind through
  eight districts of a single painted town — finish a district and the fog
  lifts on the next one
- Six painted pieces, each with its own material — waxy apple skin,
  dimpled lemon peel, light through a leaf, a water drop with real
  refraction and a caustic, veined petals, scaled butterfly wings
- Explosive ladder by match size: 4 → Firecracker (3×3), 5 → Bomb (5×5),
  6 → Dynamite (7×7), 7+ → TNT (9×9); tap to detonate, swap two for a
  mega blast
- Rainbow charging wheel → Rainbow Orb (clear a kind / board-wide storm)
- Five obstacle types: dirt, ice, two-layer ice, gnomes (guide to the
  bottom), spreading vines
- Shovel tool (3 digs per level, no move cost)
- Every rebuilt project becomes an isometric canvas-painted building
  standing on a real lot beside the lane, in the district it belongs to —
  rescued friends stroll there, hand out daily gifts, and Pipo keeps his
  dressing room
- Everything is painted under one sun: brick, ashlar, plank and plaster
  walls with real courses, tiled roofs with shadow lips, windows set into
  reveals with sky reflections, water with depth and caustics, layered
  tree canopies, and a landscape with rises, hollows and a worn road
- The cast is lit by that same sun — form shadow, ground bounce, rim light
  and a real contact shadow, all derived from the art's own silhouette at
  boot, so the characters stand in the town instead of on top of it
- The city is alive: the carousel and ferris wheel turn, flags fly,
  chimneys smoke, cloud shadows drift, and it follows the real
  calendar — blossom, high summer, falling leaves, snow — with
  pinch-zoom and lantern light at dusk
- Restoration meta: stamps are the one and only currency — stars are just a
  per-level rating — spent on 24 projects that appear on the map where they
  belong, with a daily post income from the town
- A daily hide-and-seek round played in the town itself — five friends
  hide somewhere in Pipoville and you pan the world to find them
- One shared wardrobe: any cosmetic fits any friend you've met, previewed
  for real in the shop before you buy it
- A round, always-current level button on the city screen — tap it and
  play whatever delivery Pipo is walking to, Gardenscapes-style
- Win streaks, soft pity, daily gifts, Bloom Burst endings, tutorial
  hand, hints, deadlock recovery, generative music, full juice stack
  (particles, rainbow shockwaves, hit-stop, squash-and-stretch, an
  escalating explosion ladder from firecracker pop to TNT detonation)
- Installable PWA with offline service-worker cache

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire game |
| `sw.js` | Offline cache |
| `manifest.webmanifest`, `icon.svg`, `apple-touch-icon.png` | PWA install |
| `DESIGN.md` | Architecture & experimentation guide |

See `DESIGN.md` for the engine map, level mask language, sprite pipeline,
tuning knobs, and test hooks.
