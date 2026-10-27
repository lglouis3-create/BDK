# BDK Quiz — notes for Claude

A static GitHub Pages site (https://lglouis3-create.github.io/BDK/) for studying the 2026-2027 Basic Drug Knowledge list, plus Quizlet deck files. It is built for Louis, a pharmacy student; the site is public by Louis's decision.

## Layout
- `index.html`, `assets/app.js` (all app code), `assets/style.css`, `sw.js` (offline cache), `version.json`.
- `data/decks.json` — the cards and drug rows built from the PDF by `tools/extract.py` → `tools/build.py`. `data/glossary.json` — plain-language definitions for the tap-to-define terms.
- `pages/p<n>.webp` — images of PDF pages 2-27. `downloads/` — the Quizlet deck zip and its `build_report.md`.
- `tests/` — browser tests (Playwright). `docs/daily-review.md` — the daily review checklist. `reviews/` — the review log and the questions waiting for Louis.

## Rules from Louis
1. **Card content follows the BDK Quizlet Deck Spec, and the rule is "flag, don't decide."** Never change a card's question, answer, wording, abbreviation expansion or grouping on your own. Write the proposed change, with the PDF page and the evidence, in `reviews/OPEN_QUESTIONS.md` for Louis to decide.
2. **Every number shown to the user must come from a named source** (a PDF page, a cited reference). No placeholder or inferred figures. Glossary definitions contain no figures at all.
3. **Literal language** in user-facing text: no metaphors, no sentences about the writing itself.
4. Quiz dates and pages in `QUIZZES` (app.js) come from the course syllabus; do not change them without Louis.

## Making a change
1. Run `tests/run-all.sh` (all must pass; a test that fails for a date reason is fixed in the test, not skipped).
2. Bump the version with `tools/bump-version.sh` whenever a site file changes (it updates `APP_VERSION`, `version.json` and the `sw.js` cache name together; open tabs then show the "new version" card).
3. Commit with a message that says what changed and why; push to `main` (Pages deploys from `main`).

## Behaviors worth knowing
- Progress lives in each browser's localStorage (`bdk2:*`); the repository never sees a student's progress.
- A refresh from the "new version" card saves the screen and session to sessionStorage and restores them (`saveSpot` / `restoreSpot`). Back uses a trail of screens plus browser history (`leaveCurrent`, `popstate`).
- `?debug` in the URL exposes `window.__bdk` for the tests.
- Tests that depend on the date pin the clock to `QUIZ_DAY` in `tests/lib.js`.
