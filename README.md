# AI Central — web properties

This repo hosts two static, self-contained pages that deploy together as one Vercel static site:

1. **[`crossword.html`](crossword.html)** — the **AI Central AI Vocabulary Crossword** (see below). Deployed at **`/crossword`**.
2. **`index.html`** — the editable GTA AI Quarterly whitepaper preview (see further down).

---

## AI Vocabulary Crossword (`/crossword`)

A New York Times–style crossword, built mobile-first, that teaches subscribers the vocabulary of
artificial intelligence. Everything lives in the single file `crossword.html` — no build step, no
dependencies, no backend (only Google Fonts are loaded).

### What it does

| Feature | Detail |
|---------|--------|
| **Themed word bank** | ~55 curated AI terms (MODEL, TOKEN, PROMPT, TRANSFORMER, EMBEDDING, ALIGNMENT, …), each with a plain-English clue. |
| **Auto-generated puzzles** | A seeded crossword generator interlocks the words into a dense, roughly-square grid. Every generated grid is valid — no stray letter runs. |
| **Two difficulties** | **Easy** uses everyday terms (~9 words); **Hard** pulls the full deep-learning vocabulary (~11 words). |
| **Mobile UX** | Custom on-screen QWERTY keyboard, tap-to-select with across/down toggle, a swipeable clue bar, and prev/next clue navigation — just like the NYT app. Physical keyboard works on desktop. |
| **Solving aids** | Check word, check whole puzzle, reveal letter, reveal word, and clear — from the `⋯` menu. |
| **Learning payoff** | On solving, a **glossary** lists every word and its definition, so subscribers walk away having learned the terms. |
| **Persistence** | Progress, the timer, and which puzzle you're on are saved to `localStorage`, so a refresh resumes where you left off. **New puzzle** advances the seed for an endless supply. |

### Adding or editing words

Open `crossword.html` and edit the `WORDBANK` array near the top of the `<script>`:

```js
{w:"EMBEDDING", c:"Dense vector that captures a word's meaning", l:"hard"},
```

- `w` — the answer, UPPERCASE letters only (≤ 9 characters keeps grids mobile-friendly).
- `c` — the clue.
- `l` — `"easy"` or `"hard"`.

No rebuild needed — reload the page and the generator picks up the new bank.

---

# GTA AI Quarterly — Whitepaper G (editable preview)

A shareable, single-page web preview of the **GTA AI Quarterly Report — Session 01 ("The 10/90 Divide")**,
imported from the Claude Design project *Whitepaper G – Final* and flattened into a self-contained static site.

Anyone with the link can read the latest version. **Alex** (and only Alex) can edit the text in every
box using a password, and every saved edit is stored centrally so the next visitor sees the newest version.

## How it works

| Piece | What it does |
|-------|--------------|
| `index.html` | A ~10 KB **loader** deployed to Vercel. It fetches the page markup + saved edits at runtime, renders them, and wires up the editor. Fonts load from Google Fonts. |
| `build/template.html` | The 21 A4 pages of markup (~115 KB), served from GitHub raw (public + open CORS) and fetched by the loader. Kept out of the deploy so the deployable stays tiny. |
| Editor layer | After the template is injected, every block-level text container is tagged with a stable `data-eid`. In edit mode each becomes `contenteditable`. |
| Persistence | Edits are stored as a JSON map of only the changed blocks (`{ "e12": "<new html>" }`) in Supabase and merged back on every page load. |
| Auth | Editing is gated by the password `alex-gta`, validated **server-side** by a Postgres `SECURITY DEFINER` function. |

### Editing
1. Open the site and click **Edit text** (top-right).
2. Enter the editor password.
3. Click into any text box and type. Changes **auto-save** (and there's a **Save now** button).
4. Click **Done** to return to view mode. Everyone who loads the page now sees your version.

Only the *differences* from the original template are stored, so the payload stays small.

## Persistence backend (Supabase)

- Project: `AI Central // Library` (`caevwgkbmezevykdpboe`)
- Table `public.gta_whitepaper (id text pk, content jsonb, updated_at timestamptz)` — one row, `id = 'whitepaper-g'`.
- Row-Level Security: **public read**, **no direct writes**.
- Writes go only through `public.gta_whitepaper_save(p_id, p_content, p_password)`, which checks the password
  before upserting. The client uses the public **anon/publishable** key only; no secret key is shipped.

> Security note: the password is a lightweight gate for a *preview*, checked server-side. It is not meant to be
> bank-grade — anyone determined could read the anon key and would still need to guess the password to write.

## Rebuilding

The site is generated from the exported Claude Design file:

```bash
node build/build.js   # reads build/whitepaper-g.raw.html -> public/index.html
cp public/index.html index.html
```

The build flattens the Claude Design `.dc.html`: it resolves `{{ }}` bindings, replaces `<image-slot>`
avatars with initials, swaps the AI Central logo for a text lockup, drops the paper-texture overlay,
and emits two artifacts — `build/template.html` (page markup) and `public/index.html` (the loader,
copied to the repo root). Pass `TEMPLATE_URL` to point the loader at wherever `template.html` is hosted:

```bash
TEMPLATE_URL="https://raw.githubusercontent.com/ChatGPTCentral/gta-whitepaper/refs/heads/main/build/template.html" \
  node build/build.js && cp public/index.html index.html
```

## Deploying

The repo is a **static site** (`vercel.json` sets no build step). Import
`ChatGPTCentral/gta-whitepaper` into Vercel from the `main` branch — Vercel serves `index.html`
at the root and redeploys on every push. The loader then pulls `build/template.html` from GitHub raw
and the saved edits from Supabase.
