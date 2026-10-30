# BDK drill: notes for the exam-drill-builder review

Repo: `lglouis3-create/BDK`, site https://lglouis3-create.github.io/BDK/. Course: APC III (PHAR 4232), Fall 2026, weekly Basic Drug Knowledge (BDK) quizzes. Written 2026-10-30 from this session's history and the repo at `577d5b6`.

**Pointers used below:**
- A commit hash or file path points at the repo.
- "Transcript" plus a UTC time points at this session's transcript (`/root/.claude/projects/-home-user-BDK/790af3e4-1ca1-5919-a9f6-593b41cb3115.jsonl`, outside the repo). Quotes from Louis are verbatim from it.
- Anything without a pointer is marked "from session memory, unverified".

**The skill was never invoked in this session.** The transcript holds exactly one Skill tool call: `dataviz` (transcript 2026-10-22T00:05:09Z). `exam-drill-builder` appears only in the lists of available skills. The drill was built from Louis's own "BDK QUIZLET DECK SPEC" (transcript 2026-10-21T14:06:59Z), not from SKILL.md or the template. The comparisons below are against SKILL.md as it now reads (`/root/.claude/skills/synced/…/exam-drill-builder/SKILL.md`, 245 lines). The template (`exam-drill-template/` in `lglouis3-create/Medicinal-chemistry`) was never opened: that repo was outside this session's GitHub scope.

## 1. What this drill does that SKILL.md and the template did not provide, and why

| What | Where | Why this course needed it |
|---|---|---|
| Cards generated from a table by code, not hand-written from lectures. One PDF page = one deck set (Cards, Select ALL, Essential Knowledge, Organisms), 1840 cards in 82 files, plus `build_report.md` with the audit, flags and differences from the prior year. | `tools/extract.py`, `tools/norm.py`, `tools/build.py`, `data/decks.json`, `downloads/BDK_2026-2027_Quizlet_Decks.zip`; f32c87a | The source is the BDK list PDF, a table of 300 drugs on 26 pages, not lecture decks and transcripts. Louis's spec fixes question wording, numbering, abbreviation expansion and merged-cell handling per page. |
| Quizlet import files (`Question<TAB>Answer`, LF) for every page | `downloads/BDK_2026-2027_Quizlet_Decks.zip`; f32c87a | Louis studies in Quizlet: "quiz me on the questions of each drug asked like how i like it on quizlet" (transcript 2026-10-21T13:51:09Z). |
| Merged table cells read from drawn cell rectangles, so a merged cell becomes one card naming every drug in it | `tools/extract.py`; f32c87a | Spec: "One merged cell shared by several drugs = ONE card naming every drug". |
| Multi-file static site (`index.html`, `assets/app.js`, `data/*.json`, `pages/*.webp` at 3.9 MB, `sw.js`), installable and offline, not one HTML file | repo root; 58c441d, 13ab5a6 | Page images and deck data are loaded on demand; offline use on a phone. |
| Next-quiz banner from the syllabus schedule, with a lab-day choice for lab-week quizzes | `QUIZZES` in `assets/app.js`; 58c441d, 0fab858 | Quizzes are weekly. Week 10 ran across lab days 10/20–10/22, so the banner showed the wrong day for Louis. |
| FSRS-4.5 memory model (default parameters, pass/fail grading) with predicted recall on quiz day | `assets/app.js` (`W = [...]`, line 377); 0fab858 | Louis asked for research on improving memory and tracking weak areas (transcript 2026-10-22T00:41:05Z). |
| Learn mode (successive relearning: new card right 3 times, known card once), Test, Written, Flashcards, Scroll, Match (timed pairs) | `assets/app.js`; 58c441d, 0fab858 | Requested: a Quizlet-like Learn mode, continuous scrolling, a matching game (transcript 2026-10-22T00:03:10Z, 00:41:05Z). |
| Cram mode for the day before or the day of a quiz: skips strong cards, guess first on unseen cards, retests at growing gaps; Last look sheet; choice of answer format | `assets/app.js`; 302b151, 3f3e816, 175571e | "not everything can be memorized over time.  And user might study the day of" (transcript 2026-10-22T01:08:12Z). |
| Compare tab (2–5 drugs side by side, differences in bold), mixed-up-drug tracking that drives wrong choices, "What you picked" / "What you missed" feedback | `assets/app.js`; 0fab858, 577d5b6 | Requested: side-by-side comparisons and feedback on what a wrong choice belongs to (transcript 2026-10-22T00:41:05Z; mid-turn message "when you get an answer wrong it tells you what that wrong choice is for and what you mixed up if applicable"). |
| One fact at a time: 684 "which drug?" and 986 "pick the item" questions generated from essential knowledge, with look-alike exclusion and drug-name masking | `generateWhichCards` in `assets/app.js`; 71da38b, e362e6a | Louis asked for single-fact questions and a mode to test only those (transcript 2026-10-24T17:51:54Z). |
| Category (teal) and Indications (pink) colors; the asked row shaded | `assets/style.css`; bf91dc0 | Louis: category and indication "are the hardest of the basic info" (transcript 2026-10-22T11:33:10Z). |
| Tap-to-define glossary, 198 entries, each with a MedlinePlus search link | `data/glossary.json`; bf91dc0 | Requested at transcript 2026-10-22T11:33:10Z. SKILL.md only mentions a "terms that should be glossed" table in `explain_check.js`. |
| PDF page images per quiz in the List tab | `pages/p2–p27.webp`, `tools/render_pages.py`; 13ab5a6, ae8840c | Requested at transcript 2026-10-22T18:05:22Z. |
| "New version" card whose Refresh restores the same screen and question; Back button and "Back to your …" bar; phone back gesture pauses a session | `saveSpot`/`restoreSpot`, `leaveCurrent` in `assets/app.js`; `version.json`, `tools/bump-version.sh`; e362e6a | Requested mid-turn on 2026-10-27 ("Make sure it keeps there exact spot of where they are at"; "a back button to go back to previous area the user was at"). |
| Browser test suite (data, ui, refresh, cram, regression; the regression answers every question through the site) | `tests/`; e362e6a, 577d5b6 | Needed by the daily review; the scripts had lived only in the session scratchpad. |
| Daily scheduled review (not nightly ingest) | `docs/daily-review.md`, `reviews/LOG.md`, `reviews/OPEN_QUESTIONS.md`, `CLAUDE.md`; task `trig_01VZfFupWhJzsgL7Q4f7mU2a`; e362e6a | Requested at transcript 2026-10-27T15:23:53Z. The source is a fixed list, so there are no lectures to ingest. |

## 2. Problems hit and how each was fixed

| Problem | Fix | Commit |
|---|---|---|
| First site built from earlier BDK PDFs before Louis supplied the 2026-2027 list and the deck spec | Rebuilt on the 2026-2027 list, per page, following the spec | 87d17e5 → f32c87a |
| Merged cells: a fill-down approach mishandled horizontal merges and row boxes (from session memory, unverified) | Merge groups taken from the drawn cell rectangles | f32c87a (`tools/extract.py`) |
| Text-extraction artifacts: font ligatures `(cid:…)`, displaced subscripts, hyphens at line breaks | Normalization pass | f32c87a (`tools/norm.py`) |
| Select ALL questions where every drug on the page is correct had no wrong choices | Wrong choices borrowed from the same body system (comment in `multiOptions`, `assets/app.js`) | 58c441d (`git log -S`) |
| Graded checkbox colors overridden; List panel width on phones; Match tile hyphenation; theme icon | CSS fixes | 0fab858 |
| Quiz date wrong for lab-week quizzes ("thev week 10 includes labs 10/21 & 10/22 . Like my quiz is tomorrow", mid-turn 2026-10-22) | Lab-day setting | 0fab858 |
| Progress bars sat at 0 and moved backward on misses ("Does the progress bar still move uneven…", transcript 2026-10-22T01:18:55Z) | Credit per right answer, high-water mark, separate "to redo" count | 9de2c26 |
| Cram "First look" screen showed the answer with nothing to do ("Why doesn’t it let me answer ?", transcript 2026-10-22T11:20:30Z) | Ungraded guess first, then the answer | 3f3e816 |
| No way back from a Compare link (same message) | Session paused; Back restores the same screen | 3f3e816; generalized in e362e6a |
| iPhone Safari kept hover on the choice under the last tap, which looked like a hint ("The answer was kind of are boxed which made it obvious", transcript 2026-10-22T11:50:18Z) | Hover styles only for mouse devices | 80738a4 |
| List search returned nothing for a drug outside the selected quiz (found by the regression test) | Search covers every page | 13ab5a6 |
| 16 "which drug?" questions named their own answer in the PDF wording | Answer drugs' names shown as "[this drug]"; PDF wording shown after answering | 71da38b |
| Unfair wrong choices: the same effect worded differently ("Nausea" vs "Nausea/vomiting") or a closely related term ("Bone marrow suppression" vs "Thrombocytopenia") | Look-alike rule (word parts plus term families); look-alike drugs left out of the choices | 71da38b |
| "Pick the item" questions share one question text per drug, so a typed answer naming a different correct item was graded wrong | Always multiple choice; left out of Flashcards | 71da38b |
| A methadone "pick the item" choice was one of its own boxed warnings, from its second boxed-warning card | Exclusion uses every item the drug lists in that section | 71da38b |
| Masking made two facts identical (fentanyl and oxycodone CYP3A4 warnings); a duplicated potassium chloride question | Identical masked facts merged into one Select ALL question; duplicate items removed | e362e6a |
| Cram tests failed after the quiz date passed (the Cram button only shows within a day of a quiz) | Tests pin the clock to `QUIZ_DAY` | e362e6a (`tests/lib.js`) |
| Page images p2–p4 carried Louis's highlighting (verified by pixel diff against the unmarked copy; text identical) | Re-rendered from the unmarked PDF | ae8840c |
| Learn's first step offered a list answer as one bundled multiple-choice option | One checkbox per item; count hidden on recall steps; "What you missed" | 577d5b6 |
| Scheduled review run of 2026-10-30 (session `cse_01LVkWFFU4CjSa75Wra7WnLJ`, 26 s) did no review: it had no write access to the repo, `add_repo` was not available, and its push was rejected. Its own report asks Louis to add `lglouis3-create/BDK` to the routine with write permission. | **Not fixed.** No review commits exist after 577d5b6. Runs of 10/28 and 10/29 were not inspected. | — |

## 3. SKILL.md steps that were wrong, missing or skipped here, and why

- **Every step was skipped as written:** the skill was not loaded (see the top of this file). The transcript records no reason. Louis's request named his own deck spec and Quizlet, and the build followed that spec.
- **"Check the course's Claude Project files and its Google Drive folder" before asking:**
  - Drive was searched (transcript 2026-10-21T13:51Z: searches for BDK files, Quizlet decks, the BDK PDF).
  - The Claude Project was not checked: no tool in this session reads Claude Project files. Louis asked "Are you able to look at the project of BDK IN CLAUDE" and then uploaded the PDFs and the syllabus (transcript 2026-10-21T14:06:59Z).
- **`claude/drill-app-state.md`:** never read, created or updated. Running state went to `CLAUDE.md`, `reviews/LOG.md` and `reviews/OPEN_QUESTIONS.md` in the repo.
- **`course.js` manifest, `q*.js` files, `STYLE.md` professor corpus, the question schema (`cite`, `why`, `teach`, `concept`, `dupOf`) and the checks (`build.py`, `test.js`, `style_check.js`, `render_test.js`, `cite_check.py`, `explain_check.js`, `browser_test.py`):** none used.
  - Cards come from the BDK table through `tools/build.py`, and the spec's wording rules replace `STYLE.md`.
  - The checks are `tools/build.py`'s audit (in `build_report.md`) plus `tests/run-all.sh`.
  - No polls, practice exams or professor questions were supplied for this course.
- **Skill taxonomy:** SKILL.md's drug-course taxonomy includes "mechanism". The BDK list has no mechanism column, and the site's topics follow the table columns (`TOPICS` in `assets/app.js`). The taxonomy was not proposed to or confirmed with Louis as SKILL.md describes. The topic preset "BDK quiz questions" (brand, generic, category, indication, classification) was set from the syllabus (from session memory, unverified).
- **Confidence buttons ("not sure", "I guessed") and `paceDefault`:** not implemented. Grading is pass/fail into FSRS, and Cram covers the cram pace.
- **"A select-all stem ends 'Select all that apply.'":** the stems follow Louis's spec ("Select ALL drugs with the …"). The answer widget adds "Select all that apply (N correct)." (`mountQuestion`, `assets/app.js`).
- **"Correct option never the longest":** not checked. `tests/data.js` has no such check.
- **Mode 5:**
  - SKILL.md describes nightly ingest. This course got a daily review instead (task `trig_01VZfFupWhJzsgL7Q4f7mU2a`, `CRON_TZ=America/Chicago 45 5 * * *`).
  - The time was chosen without asking Louis (SKILL.md: "ask the time once").
  - The task's prompt has no fallback for a refused push. SKILL.md's publishing section anticipates one ("A push from a cloud session may be refused by the git proxy; then deliver…"), and the 10/30 run hit exactly that.
- **"Grep the tree and any zip for tokens":** not run during the build (from session memory, unverified). A scan on 2026-10-30 found no GitHub tokens in tracked files or in the deck zip.
- **"Personal names stay out of the shared build":** "Louis" appears in `CLAUDE.md`, `docs/daily-review.md`, `reviews/LOG.md`, `reviews/OPEN_QUESTIONS.md` and `tools/build.py` in this public repo. None appears in the site's pages.
- **Spec step "Check this [organism] wording against the existing ID1 deck before building, and match it":** not done. The Drive search for existing deck files returned no files (transcript 2026-10-21T14:07Z), and `build_report.md` does not report the check as not run.

## 4. Design and content decisions Louis made (his words, transcript UTC times)

- **Deck spec (2026-10-21T14:06:59Z):**
  - "i want the drugs organized just like the section on pages pdf".
  - The full BDK QUIZLET DECK SPEC, including "Preserve the table's wording. Do not paraphrase." and "FLAG, DON'T DECIDE … Ask Louis to decide on each of these; do not resolve them silently."
- **Publishing (answer to the question at 2026-10-21T14:04Z):** "Publish it openly". The question noted that page 1 says the list is "for internal use only".
- **Site features (2026-10-22T00:03:10Z):** "a deck above notifying of the quiz upcoming"; "a tracking/tracing show what you’re missing and doung good on"; "the pages can be color coded … to match"; "light and dark screem setting along with the blue that we have"; "a continuous scrolling method".
- **Study features (2026-10-22T00:41:05Z):** "A matching game: tap pairs of brand and generic names against a timer, like Quizlet Match & side by side comparisons".
- **Cramming (2026-10-22T01:08:12Z):** "keep in mind for instances of trying to cram for memorization as well, as not everything can be memorized over time.  And user might study the day of".
- **Essential knowledge (mid-turn, 2026-10-22):** "if the essential knowledge can be displayed more clearly and keep in mind this us the hardest to memorize".
- **Colors (2026-10-22T11:33:10Z):** "should we just do it for category and indication since those are the hardest of the basic info". Colors went on Category and Indications only (bf91dc0). Louis then asked "What’s better each drug has its own color designation to each section or each section has its own color  or would that be too crowded ?" (2026-10-22T11:44:38Z); Claude recommended keeping the two colors, and no change followed.
- **Medical terms (2026-10-22T11:33:10Z):** "for some of the medical terms in indication or key side effect  it would be nice if you click on the word and it would tell you what it is".
- **PDF pages (2026-10-22T18:05:22Z):** "section where one can review the whole page pdf that each well  is covering".
- **Cram answer formats (2026-10-22T18:21:32Z):** "For the cram I want the option of just doing multiple choice, select all and writing them out".
- **Single-fact questions:**
  - Request (2026-10-24T17:51:54Z): "show me how you would formulate those and see if i approve them.  If we can also have a feature to just test on those".
  - Approval (2026-10-25T20:20:51Z): "Let’s follow you suggestions, and what’s you recommend approve all".
  - The approved points are recorded under "Decided" in `reviews/OPEN_QUESTIONS.md`.
- **Daily review (2026-10-27T15:23:53Z):** "daily automatic schedule where you review the pages for any glitches or errors in code or questions/answers or organization to optimize and improve user experience  . Additionally  in the progress list and students learning.".
- **Refresh and Back (mid-turn, 2026-10-27):** "notifies user to refresh for new updates. Make sure it keeps there exact spot"; "a back button to go back to previous area the user was at".
- **Select ALL format:**
  - Concern (2026-10-28T01:13:09Z): "having all the drugs group together as a chosen answer choice hurts the learner in making a proper connection for each drug".
  - Approval (2026-10-28T01:24:45Z): "Yes make the changes 1-3".
- **Clean page images (2026-10-28T01:15:27Z):** "here is the BDK PDF WITH PAGES NOT HIGHLIGHTED IF YOU WANT TO REPLACE THE ONES IN THE SITE THAT WERE".

## 5. Planned but not done

- **Deck-spec flags from the first build:** still waiting for Louis's decisions. Listed in `reviews/OPEN_QUESTIONS.md`, from `build_report.md` in the deck zip, open since 2026-10-21.
- **Organism wording vs the existing ID1 deck:** not checked (see section 3).
- **Daily review cannot save its work:** the routine needs the repo attached with write access (2026-10-30 run). No run has logged to `reviews/LOG.md`.
- **Offered by Claude, no decision from Louis (from session memory, unverified):**
  - one color per drug column in the Compare table;
  - letting the daily review read an exported progress file.
- **Quizlet SelectALL decks:** they still give each answer as one bundled list, as the spec requires. The 577d5b6 change applies to the site only.
- **`claude/drill-app-state.md`:** never created.

## 6. State doc

- **None in the SKILL.md format.** The repo has no `claude/drill-app-state.md` (checked 2026-10-30), and this session created none in a Claude Project.
- **Whether the course's Claude Project ("BDK") holds one:** not checked. No tool in this session reads Project files.
- **Running state for this course lives in the repo:**
  - `CLAUDE.md`: layout, Louis's rules, release steps;
  - `reviews/LOG.md`: change and review log;
  - `reviews/OPEN_QUESTIONS.md`: decisions waiting for Louis;
  - `docs/daily-review.md`: review checklist;
  - `build_report.md` inside `downloads/BDK_2026-2027_Quizlet_Decks.zip`: card counts, audit, flags, prior-year differences.
