# 🌻 Aleville

A complete, self-contained garden match-3 puzzle game — Gardenscapes-style
meta on top of a size-tiered explosive match-3, built as a single offline
HTML file with zero dependencies and zero image assets (every sprite is
canvas-painted at boot).

**Play:** https://aleville.vercel.app — on iPhone, open in Safari →
Share → **Add to Home Screen** for the full-screen offline app.

## What's inside

- 30 levels across a winding garden map, 7 badged hard levels
- Six painted pieces (apple, lemon, leaf, drop, flower, butterfly)
- Explosive ladder by match size: 4 → Firecracker (3×3), 5 → Bomb (5×5),
  6 → Dynamite (7×7), 7+ → TNT (9×9); tap to detonate, swap two for a
  mega blast
- Rainbow charging wheel → Rainbow Orb (clear a kind / board-wide storm)
- Five obstacle types: dirt, ice, two-layer ice, gnomes (guide to the
  bottom), spreading vines
- Shovel tool (3 digs per level, no move cost)
- Restoration meta: stars are currency, spent on 12 garden tasks with
  Barnaby the groundskeeper, a day counter, and landmarks appearing on
  the map
- Win streaks, soft pity, daily gifts, Bloom Burst endings, tutorial
  hand, hints, deadlock recovery, generative music, full juice stack
  (particles, rainbow shockwaves, hit-stop, squash-and-stretch)
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
