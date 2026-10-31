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

## 2026-10-31 — Saturday: next quiz (Week 14, 17 Nov, pages 5 and 9)
- Tests: all passed (data, ui, refresh, cram, regression).
- Compared 12 random cards from pages 5 and 9 with the page images: all answers match the PDF. No card, date or code change needed.
- Next quiz banner data (Week 14: pages 5, 9; Nov 17-19) matches the syllabus entry in the app.
- Nothing fixed, no new questions for Louis. The earlier open questions (deck spec flags) are unchanged.
- Note: this session was set to work on branch claude/cool-bohr-u1k9zo, so this entry is pushed there, not to main.
