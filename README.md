# BDK Quiz

A static practice site and Quizlet deck set for the 2026-2027 Basic Drug Knowledge (BDK) list ("BDK List Revised May 2026"), organized page by page like the PDF (pages 2-27).

## The site

- **Quiz tab:** pick pages directly or tap a BDK quiz from the APC III Fall 2026 schedule (the next quiz is preselected by date). Choose decks (Cards, Select ALL, Essential Knowledge, Organisms) and, within Cards, the question types (brand, generic, pharmacologic category, classification, common indications).
- **Modes:** multiple choice (4 options), written (with an "I was right" override), and flashcards (cards marked "Still learning" return at the end of the round). Missed questions are remembered in the browser.
- **Drug list tab:** each page's table with its footer legend, searchable.
- **Download:** `downloads/BDK_2026-2027_Quizlet_Decks.zip` holds the Quizlet import files and the build report.

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
