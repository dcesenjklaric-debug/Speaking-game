# Lessons

Bugs and their root cause — not just the fix. Read this before re-debugging
something that may already have been solved once. Newest first.

## `package.json` with `"type": "module"` breaks EVERY `.js` file in the tree, not just the ones it was added for
Added `"type": "module"` so `api/claude.js` and `api/license.js` (which use
`import`) load correctly on Vercel. This silently flipped `serve.js` — a
completely unrelated local dev script — from CommonJS to ES module scope, so
its `require()` and `__dirname` calls broke with
`ReferenceError: require is not defined`. `node --check serve.js` reported no
syntax error (the syntax is valid in either module system); only actually
running it surfaced the crash. **Lesson: a module-scope change is project-wide,
not file-scoped. After one, audit every plain `.js` file for CommonJS-only
constructs (`require`, `__dirname`, `__filename`, `module.exports`), and verify
by execution, not by syntax check.**

## A licence-key separator that collides with its own alphabet fails silently, ~49% of the time
First format: `QW-<base64url(body)>-<base64url(sig)>`. Base64url's alphabet
includes `-`, which was also the field separator — the regex's greedy match
split at the *last* `-` in the whole string, so whenever the signature itself
contained a `-` (measured probability ≈49%), the split landed inside the
signature and verification failed on an otherwise-valid key. A security audit
reproduced it directly: 975/2000 minted test keys failed to verify. Not a
forgery risk — just meant roughly half of paying customers would receive a
dead key. **Fixed by switching the separator to `.`, which is outside the
base64url alphabet.** Lesson: never pick a delimiter from the same character
set as the data it's delimiting; prove it with a few thousand generated
samples, not a handful of manual tries.

## `x-forwarded-for`'s first entry is attacker-controlled
The original rate limiter keyed its bucket on
`(req.headers["x-forwarded-for"] || "").split(",")[0]` — the **left-most**
entry in an XFF chain is appended by whichever hop is furthest from the
server, which in practice is the client itself. Anyone could send a fresh
fake value per request and get a new rate-limit bucket every time, making the
"3 free rounds/day" limit worthless. Also let an attacker exhaust a *specific
victim's* quota by spoofing their real IP. **Fixed: use `x-real-ip` (platform-
set on Vercel) or the right-most XFF entry, never the left-most or
client-suppliable one.**

## `esc()` didn't exist — and the test that should have caught it was stubbing the very thing it needed to verify
Wrote `escapeHtml(topic.hook)` as `esc(topic.hook)`, based on a grep hit that
actually matched `const esc = escapeHtml(text)` — a variable **local to a
different function**, invisible from the code being written. The bug shipped
because the verification harness's stub sandbox defined its own `esc()`
helper, so the check passed in the harness and threw in the real browser.
**Lesson: a test sandbox that supplies a dependency under test isn't testing
anything — it's testing the test's own assumptions.** The real fix was a
checker that strips string/comment literals from the source and resolves
every identifier a code block references against the file's *actual*
top-level `function`/`const` declarations, distinguishing "doesn't exist" from
"exists only as a local inside another function."

## JSON is the wrong wire format for multi-paragraph AI-generated prose
Crash Course originally asked the model for
`{"title":...,"body":"paragraph one\n\nparagraph two"}`. Raw newlines and
unescaped quotes inside a JSON string are invalid JSON — the model wrote
perfectly good prose that `JSON.parse` then couldn't read, surfacing as
"The topic came back malformed." **Fixed by switching to a delimited plain-text
format** (`TITLE: …` / `HOOK: …` / `BODY:\n…`) with no escaping rules to
violate; JSON is kept only as a fallback path, with a raw-newline repair pass
for when a model reaches for JSON anyway. Lesson: JSON is the right choice for
structured short fields: it is the wrong choice for anything that is
substantially free-form prose.

## The Windows Python "installed" check that isn't
`where python` succeeds even when Python isn't installed — the Microsoft
Store ships a placeholder `python.exe` on PATH that does nothing but pop the
Store when actually run. `play.bat` originally trusted `where python`, so it
detected "success," opened the browser, then silently failed to start any
server — "Hmm, we can't reach this page" with no visible error. Fixed by
switching to Node as the primary path and, for the Python fallback, actually
running `python --version` rather than checking PATH presence.

## `exec()` is async — exiting right after calling it kills the browser launch
`serve.js`'s "already running, just open it" branch called `openBrowser(url)`
then `process.exit(0)` on the next line. `exec` spawns the OS `start` command
asynchronously, so the process exited before Windows could actually launch
anything — the console printed the right message and nothing opened. Fixed by
threading a `done` callback through `openBrowser` and only exiting once the
spawn reports back (with a timeout so the window can't hang if it never does).
