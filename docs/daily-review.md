# Daily review

A scheduled Claude session runs this every morning. Read `CLAUDE.md` first; its rules apply to everything here.

## 1. Start
- `git pull origin main`, then `tests/run-all.sh`. Note what passed and failed.
- Read `reviews/LOG.md` (last 7 entries) and `reviews/OPEN_QUESTIONS.md`, so you do not repeat a finding that is already logged or waiting for Louis.

## 2. Review (all areas every day; go deeper on today's focus)
Focus by weekday: Mon code and performance · Tue questions and answers · Wed organization and navigation · Thu progress and learning · Fri phone and iPad layout, themes, accessibility · Sat/Sun the next quiz's pages end to end as a student would study them.

- **Code:** test failures, console errors, dead code, slow screens, anything that breaks offline use or the update card.
- **Questions and answers:** run `tests/data.js`; then take 25 random cards from the next quiz's pages and compare each answer with the PDF page image (`pages/p<n>.webp`). Look for wrong answers, unclear or ambiguous questions, answer choices that give the answer away, and choices that are unfair (also true for the drug asked about).
- **Organization:** the next-quiz banner is right for today's date (pages, date, lab-day logic); List, Compare and PDF pages match the PDF's sections and colors; Back returns to the right place.
- **Progress and learning:** with a simulated study history (pin the clock, answer cards right and wrong over several days), check that the Progress tab's numbers add up (card states sum to the total; accuracy = right ÷ answered), that reviews come due on the expected days, that misses come back, and that the tips match the data. Compare the learning methods with current research on retrieval practice, spacing, interleaving and cramming; propose improvements with citations.
- **Experience:** walk the main flows at 390 px width (Study → Learn, Test, Cram; Progress; List; Compare) in light, dark and blue. Note confusing wording, extra taps, and anything hard to read or tap.

## 3. Act
- **Fix now** (test, then `tools/bump-version.sh`, commit, push to `main`): bugs, errors, broken layout or links, failing tests, accessibility problems, and small wording or layout fixes that do not change how a feature works.
- **Never change on your own; add to `reviews/OPEN_QUESTIONS.md` instead:** card questions, answers or grouping; deck files; the meaning of a glossary definition; quiz dates; learning-algorithm parameters; removing or redesigning a feature; anything that needs a number you cannot source.
- One review run makes at most a few focused commits. If a fix is large, propose it instead.

## 4. Record
- Append one entry to `reviews/LOG.md`: date, focus, test result, each fix with its commit, each new question for Louis. Keep it under 15 lines. Commit and push it.
- Finish with a short message for Louis (it reaches the phone): what was checked, what was fixed, what needs a decision. If nothing needed fixing, say so in one line.
