"""Extract BDK tables from the PDFs into raw.json.

Cells pdfplumber reports as merged (None) are resolved with the drawn cell
rectangle covering them: a rectangle that starts in an earlier column is a
horizontal merge (text spanning Indication + Essential Knowledge) and leaves
this column blank; otherwise it is a vertical merge (one category spanning
several drugs) and the value above repeats down.
"""
import pdfplumber, json, sys, re

D = sys.argv[1]
SOURCES = [
    ('2026_msk_endo1.pdf', '2026-2027 (Revised May 2026)'),
    ('2026_cns345.pdf', '2026-2027 (Revised May 2026)'),
    ('2026_id1_gi_pho1.pdf', '2026-2027 (Revised May 2026)'),
    ('2025_full.pdf', '2025-2026 (Revised May 2025)'),
]
FIELDS = [('Pharmacologic', 'category'), ('Generic', 'generic'), ('Brand', 'brand'),
          ('Classification', 'classification'), ('Common', 'indication'), ('Essential', 'essential')]

def clean(s):
    s = (s or '').replace('(cid:415)', 'ti').replace('\n', ' ')
    return re.sub(r'\s+', ' ', s).strip()

def covering(cells, x, y):
    for c in cells:
        if c[0] - 0.5 <= x <= c[2] + 0.5 and c[1] - 0.5 <= y <= c[3] + 0.5:
            return c
    return None

sections = {}
for fn, edition in SOURCES:
    pdf = pdfplumber.open(f'{D}/{fn}')
    for pno, pg in enumerate(pdf.pages, 1):
        for tb in pg.find_tables():
            grid = tb.extract()
            hdr_i = next((i for i, r in enumerate(grid) if r and clean(r[0]).startswith('Pharmacologic')), None)
            if hdr_i is None:
                continue
            title = ' '.join(clean(c) for c in grid[0] if c) if hdr_i > 0 else \
                clean((pg.extract_text() or '').split('\n')[0])
            title = re.sub(r'\s*Pharmacologic.*$', '', title)
            if title in sections:
                continue  # the 2026 edition of this section is already loaded
            hdr_cells = tb.rows[hdr_i].cells
            hdr_text = [clean(c) for c in grid[hdr_i]]
            cols = []  # (field, x0, x1) for each wanted column
            for prefix, field in FIELDS:
                j = next(j for j, h in enumerate(hdr_text) if h.startswith(prefix))
                cols.append((field, hdr_cells[j][0], hdr_cells[j][2]))
            gcol = next(j for j, h in enumerate(hdr_text) if h.startswith('Generic'))
            colidx = [next(j for j, h in enumerate(hdr_text) if h.startswith(p)) for p, _ in FIELDS]
            prev = [''] * len(FIELDS)
            rows = []
            for i in range(hdr_i + 1, len(grid)):
                gcell = tb.rows[i].cells[gcol]
                y = (gcell[1] + gcell[3]) / 2 if gcell else None
                cur = []
                for k, ((field, x0, x1), j) in enumerate(zip(cols, colidx)):
                    c = grid[i][j]
                    if c is not None:
                        cur.append(clean(c))
                        continue
                    rect = covering(tb.cells, (x0 + x1) / 2, y) if y is not None else None
                    # Merged from the left (spans an earlier column): not this column's text.
                    cur.append('' if rect and rect[0] < x0 - 1 else prev[k])
                prev = cur
                d = dict(zip([f for _, f in FIELDS], cur))
                if d['generic']:
                    rows.append(d)
            sections[title] = dict(title=title, edition=edition, source=f'{fn} p{pno}', drugs=rows)

json.dump(list(sections.values()), open(f'{D}/../raw.json', 'w'), indent=1, ensure_ascii=False)
for s in sections.values():
    print(f"{s['title']:<40} {s['edition'][:9]} {s['source']:<26} {len(s['drugs'])}")
print('TOTAL', sum(len(s['drugs']) for s in sections.values()))
