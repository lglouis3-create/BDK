# BDK Quiz

A static practice site for the Basic Drug Knowledge (BDK) list. It asks the five question types used on the BDK quizzes:

- What is the **brand name** of _generic_?
- What is the **generic name** of _brand_?
- What is the **pharmacologic category** of _generic_?
- What is the **common indication** of _generic_?
- What is the **classification** of _generic_? (Rx only, OTC, or the controlled-substance schedule)

Modes: multiple choice (4 options, like a Quizlet test), written (type the answer, with an "I was right" override), and flashcards (cards marked "Still learning" come back at the end of the round). Each answer shows the full drug row and its essential knowledge. The **Drug list** tab is a searchable copy of the table. Missed questions are remembered in the browser so you can quiz only those.

## Data

`data/bdk.json` holds 300 drugs in 26 sections. Sections come from two editions of the list:

| Edition | Sections |
| --- | --- |
| 2026-2027 (Revised May 2026) | Musculoskeletal, Endocrine 1, CNS 3–5, ID 1, GI 1–2, Pain/Heme/Onc 1 |
| 2025-2026 (Revised May 2025) | DEENT 1–2, Pulmonary, Renal, CV 1–4, ID 2–4, Endocrine 2–3, CNS 1–2, Pain/Heme/Onc 2–3 |

The quiz labels each section with its edition (sections from the older list carry a "25–26" tag).

## Updating the list

The data is extracted from the BDK PDFs with [pdfplumber](https://github.com/jsvine/pdfplumber):

```sh
pip install pdfplumber
# put the PDFs in a folder, list them in SOURCES at the top of tools/extract.py
python3 tools/extract.py path/to/pdfs        # writes path/to/raw.json
python3 tools/clean.py path/to/raw.json data/bdk.json
```

`extract.py` reads each table and resolves merged cells from the PDF's cell geometry. When a section appears in more than one PDF, the first file in `SOURCES` wins. `clean.py` fixes extraction artifacts (displaced subscripts such as "Alpha2", line-break hyphens, a font ligature) through an explicit replacement list, and prints any row that still looks wrong.

## Running locally

```sh
python3 -m http.server
# open http://localhost:8000
```
