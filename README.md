# BDK Quiz

A static practice site and Quizlet deck set for the 2026-2027 Basic Drug Knowledge (BDK) list ("BDK List Revised May 2026"), organized page by page like the PDF (pages 2-27).

## The site

- **Study tab**
  - **Next-quiz banner** (APC III Fall 2026 schedule): your quiz date (pick your lab day for lab-week quizzes), the pages and calculation topic, predicted recall on quiz day, and **Today's plan** (reviews due plus new cards for the next quiz; every unstudied quiz card in the last 2 days).
  - **1 Pages** (color-coded with the PDF's header colors) · **2 What to practice** (Brand ↔ generic, Drug class, Indications, Rx/OTC/schedule, Side effects & boxed warnings, Other notes, Organisms; presets: BDK quiz questions, Everything, Safety only) · **3 How**.
- **Modes**
  - **Learn:** rounds of 7. A new card is answered right three times (multiple choice, then recall twice, spaced apart); a card you already know needs one recall; a miss starts it over later in the round.
  - **Test**, **Scroll** (all questions on one page), **Written**, **Flashcards**, and **Match** (6 pairs per board, a wrong pair adds 1 second, best times saved).
  - **Cram** (quiz today or tomorrow): pick the time you have; skips cards whose predicted recall on quiz day is already 90%+, asks you to guess each unfamiliar card first (the guess is not graded; trying before studying helps the answer stick), shows the answer, then tests it at growing gaps (2 right to finish; a miss comes back 3 cards later). Choose how it asks (on the quiz banner or in step 3): **Mixed** (multiple choice, then recall), **Multiple choice**, **Select ALL** (only list-answer questions, as checkboxes) or **Written** (typed; list answers stay checkboxes and long answers are self-checked). Ends with **Last look**: one page of the cards you missed plus the weakest remaining cards, to read right before the quiz.
  - List answers (ALL / Select ALL) use checkboxes. A wrong answer shows **what you picked**: the drug that answer belongs to, with a Compare link.
  - "Which drug?" questions for side effects and boxed warnings that only 1–2 drugs on a page have.
- **Compare tab:** up to 5 drugs side by side (whole class or one at a time); bold = differs, gray = shared; "only differences" toggle; learn them together. Mixed-up pairs from wrong answers and Match are listed here. Opening Compare from a question pauses your session; **Back to your questions** returns to the same screen.
- **Progress tab:** predicted recall on quiz day, due reviews, accuracy by question type, readiness by page, mixed-up drugs, trouble cards, daily activity, suggested next steps, export/import.
- **Memory model:** FSRS-4.5 (default parameters). Each card's memory strength is the number of days until predicted recall falls to 90%; a right answer raises it (more after a longer gap), a miss lowers it and brings the card back today; only the first answer of the day counts; reviews are moved up to the day before the quiz covering the card's page. Familiar = 2+ days, mastered = 7+ days.
- **Colors and definitions:** Category (teal) and Indications (pink) have their own color in every drug entry, question label, Compare row and List column; after you answer, the row the question asked about is highlighted. Medical terms in indications, side effects, boxed warnings and notes are underlined: tap one for a plain-language definition (written for this site, not quoted from a reference) and a MedlinePlus search link. The definitions are in `data/glossary.json`.
- **List tab:** pick a quiz (Week 2 … Cumulative, or All pages) to show only its pages, and switch between **Table** and **PDF pages** (images of the PDF pages, `pages/p<n>.webp`; tap one to open it full size). The Study banner's **PDF pages** button opens the next quiz's pages. Search always looks at every page. Each page's table under its PDF header color with its footer legend; essential knowledge in sections (key side effects, boxed warnings, other notes; class-shared side effects grayed); Quizlet deck download.
- **Themes:** Auto, Light, Dark, Blue. **Offline:** installable, works without a connection after the first visit. Progress stays in the browser.

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
