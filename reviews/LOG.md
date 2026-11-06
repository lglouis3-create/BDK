# Daily review log

Newest entries at the bottom. One entry per run.

## 2026-10-27 — setup
- Test suite added (`tests/run-all.sh`: data, ui, refresh, cram, regression): all passed.
- Found and fixed while building it: two "which drug?" questions became identical once drug names were hidden (fentanyl/oxycodone CYP3A4 warning, now one Select ALL question); a duplicated potassium chloride "pick the item" question.
- Added: "new version" card with refresh that keeps your place; Back button and "Back to your …" bar.

## 2026-10-28 — clean PDF page images
- Louis supplied an unmarked copy of the PDF. Its text is identical to the copy the decks were built from (pdftotext diff: 0 lines), so no card changed.
- Pages 2, 3 and 4 of the old images carried highlighting; they are re-rendered from the unmarked copy (pages 5-27 were already pixel-identical). Added `tools/render_pages.py`.
- Tests: all passed.

## 2026-10-28 — Select ALL format (approved by Louis)
- Learn no longer offers a list answer as one bundled choice: every list is one checkbox per item; Learn's recall steps hide the number correct.
- Feedback names each item that belonged but was left unchecked ("What you missed"), each drug with its own fact.
- Reason: bundled ("complex", Type K) choices can be answered by recognizing one item (Haladyna, Downing & Rodriguez 2002; Couch, Hubbard & Brassil 2018).
- Tests: all passed (new Learn checks in tests/ui.js).

## 2026-11-01 — offline copy and saved progress (approved by Louis)
- `sw.js` deleted every cache not named for the current version. Cache Storage is shared by all of lglouis3-create.github.io, so a BDK update deleted the Medicinal-chemistry drill's offline copy. Cleanup now deletes only `bdk-*` caches.
- The saved copy is now also used when the network answers slower than 3.5 s.
- When the browser refuses to save (storage full, blocked, private window), `store` keeps the value for the visit and shows one notice pointing to Export progress; the site asks the browser to keep its storage (not in Firefox, which would show a popup).
- New `tests/offline.js` (4 checks fail on the previous code). Tests: all passed (data, ui, refresh, cram, offline, regression). Commit `c78e78d`, version v16.

## 2026-11-01 — Home Screen card (approved by Louis)
- Study (until "Not now") and Progress show a Home Screen card. On iPhone and iPad in Safari it gives the steps Export progress → Add to Home Screen → Import progress in the new copy, because a Home Screen copy keeps its own storage, separate from Safari's (WebKit bug 181849), and Safari deletes a site's saved data after 7 days without use unless it is on the Home Screen (webkit.org/tracking-prevention). Other browsers with an install prompt get an Install BDK button. Version v17.
- Tests: data, ui, refresh, cram, offline and home passed; new `tests/home.js` (19 checks).
- Open: `regression` failed once in 4 runs today ("right answer graded wrong" on the pick-the-item question "Which of these is a key side effect of penicillin V potassium (PO), …?"; two cards share that text, answers "Diarrhea" and "Hypersensitivity reactions"). It passed on re-runs of both v17 and v16. Cause not found; check whether a choice list can contain the other card's answer.

## 2026-11-01 — answer history (approved by Louis)
- Every answer is now also kept in an answer history (`bdk2:log`: time, card code, right or wrong, mode), for fitting the memory model to Louis's own answers when BDK moves to FSRS-7 with the kit. Scheduling is unchanged. Export carries it, Import merges it, Reset clears it; if the browser refuses to save it, the oldest half is dropped so progress keeps saving. Version v18.
- Tests: all passed (data, ui, refresh, cram, offline, home, history, regression); new `tests/history.js` (12 checks).

## 2026-11-02 — daily review (Monday: code and performance)
- Tests: all passed (data, ui, refresh, cram, offline, home, history, regression). Regression re-run: passed again.
- Open item from 2026-11-01 (regression failed once on the penicillin V potassium "pick the item" question): checked every pair of "pick the item" cards that share a question text. No card's wrong choices ever contain the other card's answer, so the choices are fair and the cause is not in the site code. 1 failure in about 6 later runs, none reproduced; most likely timing in the test. Left as is; watch for a repeat.
- No site file changed, so no version bump. No new questions for Louis.

## 2026-11-05 — My drug lists (requested by Louis)
- Study step 1 can use a drug list instead of PDF pages; lists are made by pasting a slide's list or searching, and each pasted line is matched to the BDK list.
- Checked against Louis's "Possible medications" slide: 18 of 19 lines match exactly; "Methylphenidate (Focalin XR, Focalin)" is flagged because on the BDK list Focalin is dexmethylphenidate (p19), and both drugs are offered unchecked.
- "BDK page" prints the list in the PDF's layout and wording; "See above" (opioid boxed warnings) gets the p25 list added and labeled.
- Fixed while testing: topic counts in Study counted the selected pages instead of the list; the UI color check depended on which question came up first.
- Tests: all passed (new tests/lists.js).

## 2026-11-05 — course list "OSCE Fall 2026" (requested by Louis)
- Louis asked for a list labeled "OSCE Fall 2026". The PDF he mentioned did not arrive in the session; Drive holds `APC-III-Week-11-OSCE-Prep_2026.pdf` (Dr. Lahoud, October 26, 2026), whose "Possible Medications" slide has the same 19 lines as the screenshot sent earlier the same day.
- `data/course-lists.json` holds the list (21 drugs); the app adds course lists to each student's lists once. Methylphenidate and dexmethylphenidate are both included because the slide writes "Methylphenidate (Focalin XR, Focalin)" and on the BDK list Focalin is dexmethylphenidate (p19); Louis can remove either.
- Tests: all passed.

## 2026-11-06 — daily review (Friday: phone and iPad layout, themes, accessibility)
- Tests: all passed (data, ui, lists, refresh, cram, offline, home, history, regression).
- Checked Study, Progress, List and Compare at 390 px and 820 px in light, dark and blue: no sideways scroll, no page errors; text contrast measured on every text element.
- Fix: the Back button text was 4.31:1 (light) and 4.06:1 (blue), below the 4.5:1 minimum (WCAG 2.1 SC 1.4.3). It now uses the main text color. Version v21.
- For Louis: tap targets under 44 px (top bar, theme button, Back, day chips, Compare page numbers); see OPEN_QUESTIONS.md.
