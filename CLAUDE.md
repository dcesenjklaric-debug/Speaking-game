# Quick Wit — project memory

Quick Wit is an impromptu-speaking practice game: one `index.html` (a single-file
browser app) plus a few small Vercel serverless functions in `api/`. See
`design/README.md` for the visual design system and `DEPLOY.md` for hosting.

## Before making changes

Read the relevant files below first — not everything, just what the task touches.
This is a lookup table, not a reading list:

| If the task touches... | Read |
|---|---|
| Any past decision ("why is it built this way") | [[decisions]] |
| A bug that feels familiar | [[lessons]] — check it before re-debugging something already solved once |
| "What's the current state of this project" | [[project-context]] |
| How a system fits together (round lifecycle, paywall, save data) | [[architecture]] |
| The two serverless endpoints, request/response shapes, env vars | [[api]] |
| "What's left to do" | [[todo]] |

> Links above are Obsidian-style `[[wikilinks]]` — `[[decisions]]` resolves to
> `memory/decisions.md`, `[[architecture]]` to `docs/architecture.md`, and so
> on. They render as plain double-bracketed text outside Obsidian, which is
> still readable; inside Obsidian they're clickable and populate the graph
> view.

## After making changes

Write back what a future session would otherwise have to rediscover:
- A **decision** (a real choice with a tradeoff, e.g. "server-enforced, not client") → `memory/decisions.md`
- A **bug and its root cause** (not just the fix — the *why*, so it isn't reintroduced) → `memory/lessons.md`
- Status change (shipped something, found something broken) → `memory/project-context.md`
- New or resolved work → `tasks/todo.md`

Keep entries short and dated-in-spirit (newest at the top of each file). Don't
duplicate information across files — link to the other file instead of copying.

## Operating rules learned the hard way in this repo

- **Test by running, not by syntax-checking.** `node --check` would not have caught
  either of the two worst regressions shipped this cycle (a `require()` call in a
  file `package.json` had just switched to ES module scope; a licence-key
  separator that collided with its own encoding alphabet, silently failing ~49%
  of mints). Actually execute the code path — a stub HTTP request, a real
  `node serve.js` on a spare port, a headless run of the real function — before
  calling something done. See `memory/lessons.md`.
- **A test sandbox that supplies a missing dependency hides the bug it exists to
  catch.** Resolve identifiers against the file's real top-level scope, not
  against whatever the test harness conveniently defines.
- **Local dev server is `node serve.js`** (wrapped by `play.bat`). Do not trust
  `where python` as a "is Python installed" check on Windows — the Microsoft
  Store ships a placeholder `python.exe` that satisfies `where` but only opens
  the Store.
- **The browser preview pane cannot load `localhost`.** Verify server-rendered
  pages with `curl` or a headless script against the real functions instead.
- **Never commit `.env` or any real secret.** `LICENSE_SECRET` mints Pro licences;
  if it leaks, the only fix is rotating it, which invalidates every existing
  customer's key at once. `.gitignore` already excludes `.env*`.
- **The paywall's source of truth is the server**, never the browser. `isPro` /
  `freeLeft` in `index.html` are display-only. If a feature needs gating, gate it
  in `api/claude.js`, not in client JS.
