# BDK Quiz

A static practice site and Quizlet deck set for the 2026-2027 Basic Drug Knowledge (BDK) list ("BDK List Revised May 2026"), organized page by page like the PDF (pages 2-27).

## The site

- **Study tab:** a banner for the next BDK quiz (APC III Fall 2026 schedule: date, pages, calculation topic, and how much of it you have mastered), then page selection, color-coded with the PDF's header colors.
- **Modes:**
  - **Learn:** rounds of 7. Each card is asked as multiple choice first, then from memory (typed, select-all checkboxes, or a self-check for long notes). Right twice = mastered for the session; a miss sends the card back into the round.
  - **Test:** one question at a time; list answers (ALL / Select ALL) use checkboxes.
  - **Scroll:** every question on one scrolling page.
  - **Written** and **Flashcards.**
- **Which cards:** all, due for review, missed last time, or not studied yet.
- **Progress tab:** mastery, accuracy, due count, and streak; next-quiz readiness by page; accuracy by question type; cards answered per day; trouble cards; suggestions with one-tap practice; export/import of progress between devices.
- **Review schedule:** each right answer moves a card's next review out 1, 2, 4, 7, then 14 days (one step per day at most); a miss brings it back the same day; reviews are moved up to the day before the quiz that covers the card's page.
- **List tab:** each page's table under its PDF header color, with its footer legend, searchable.
- **Themes:** Auto, Light, Dark, Blue (button in the top bar).
- **Offline:** installable to a phone home screen; works without a connection after the first visit.
- Progress is saved in the browser (localStorage); nothing is sent anywhere.

## The decks

Each source page gets its own files: `BDK_p<page>_<Section>_Cards.txt`, `_SelectALL.txt`, `_EssentialKnowledge.txt`, and `_Organisms.txt` on Infectious Diseases pages. One card per line, `Question<TAB>Answer`, UTF-8, LF line endings. In Quizlet, import with **Tab** between term and definition and **New line** between cards.

## Rebuilding from the PDF

```sh
pip install pdfplumber
python3 tools/extract.py 2026-2027-Basic-Drug-Knowledge-List.pdf pages.json
python3 tools/extract.py 2025-2026-Basic-Drug-Knowledge-List.pdf pages_prior.json
python3 tools/build.py pages.json pages_prior.json out/
cp out/decks.json data/decks.json
cp out/BDK_2026-2027_Quizlet_Decks.zip downloads/
```

- `extract.py` reads each page's table and its footer legend, and records which drugs share a merged cell (from the drawn cell rectangles), so a merged notes cell becomes one card naming every drug in it.
- `norm.py` undoes text-extraction artifacts only (displaced subscripts such as "Alpha2", hyphens at line breaks, font ligatures).
- `build.py` writes the decks, runs the audit (every drug present, one tab per line, no duplicates or empty fields, ONLY/ALL matching item counts, Select ALL groups of 2+), and writes `build_report.md` with card counts, abbreviation sources, items flagged for review, and differences from the prior-year list.

## Running locally

```sh
python3 -m http.server
# open http://localhost:8000
```
