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
