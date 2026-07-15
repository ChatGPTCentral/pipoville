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
