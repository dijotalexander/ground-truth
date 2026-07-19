# Ground Truth — project structure

Four files, one job each:

| File | What it's for | Who edits it |
|---|---|---|
| `content.json` | All copy: dispatch chapters, assignments, map nodes, edges | You (or anyone), most weeks |
| `styles.css` | Colors, type, spacing, layout | Rarely — design changes only |
| `app.js` | Reads `content.json`, builds the page | Rarely — logic changes only |
| `index.html` | Empty shell that loads the above three | Almost never |

`preview.html` is a **generated** file — everything above bundled into one, so it can be opened directly or shared as a single artifact. It is not meant to be hand-edited; regenerate it from the source files instead (see below).

## Adding a new week's content

Open `content.json`:
- Add a new object to the `dispatches` array (copy the shape of `week1-prediction`).
- Give it a unique `"id"`, the next `"weekNumber"`, a short `"weekLabel"` (shows in the picker pill), and a `"status"` of `"draft"` or `"published"`.
- Add new objects to `map.nodes` for any new concepts, tagging each with `"dispatchId"` and `"chapterId"` if it should link back into a chapter.
- Add entries to `map.edges` to connect new nodes to existing ones.

No other file needs to change for a content-only update.

## The draft/published workflow

Every dispatch has a `"status"`:
- `"draft"` — shows as a pill in the week picker (with a small "draft" tag) but clicking it shows a "not yet published" placeholder instead of breaking. Use this to stake out a week before you've written it — even just `weekNumber` and `weekLabel` is enough for it to appear correctly.
- `"published"` — full chapters render normally.

The site always opens on the first `"published"` week, so half-finished draft weeks never become what a visitor sees first. This is meant to survive the natural rhythm of a side project: bursts of a few weeks built quickly, then slower stretches — nothing looks broken in between, and picking it back up later is just flipping a draft to published once it's written.

## Previewing locally

Opening `index.html` by double-clicking will show a blank/loading state — browsers block a local file from reading another local file (`content.json`) for security reasons. Two options:

**Fastest — open `preview.html` instead.** It has the same content baked in and works by double-clicking, no server needed. Regenerate it any time `content.json` changes (ask Claude to rebuild it, or run the small Python snippet used to build it).

**For real development — run a local server** from this folder, then visit the printed address:
```
python3 -m http.server 8000
```
Then open `http://localhost:8000/index.html` — this is closer to how it'll behave once deployed.

## Deploying for real

`index.html` + `styles.css` + `app.js` + `content.json` are a complete static site. Any static host works — GitHub Pages, Vercel, Netlify. Push the four files (skip `preview.html`), and `fetch('content.json')` will work normally over http/https with no server-side code needed.
