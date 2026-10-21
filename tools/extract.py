"""Extract every BDK page (one table per page) with merged-cell groups and footer legends.

Output: pages.json, a list of
  {page, title, legend: {ABBR: expansion}, legend_raw, rows: [
     {generic, brand, category, classification, indication, essential,
      groups: {field: group_id}}]}
A group_id is shared by every row that sits inside the same drawn cell, so
merged cells (one category or one notes cell spanning several drugs) can be
turned into one card naming every drug in the merge.
"""
import pdfplumber, json, sys, re

pdf_path, out_path = sys.argv[1], sys.argv[2]
FIELDS = [('Pharmacologic', 'category'), ('Generic', 'generic'), ('Brand', 'brand'),
          ('Classification', 'classification'), ('Common', 'indication'), ('Essential', 'essential')]


LIGATURES = {'(cid:415)': 'ti', '(cid:332)': 'ft', '(cid:425)': 'tt'}


def unlig(s):
    for k, v in LIGATURES.items():
        s = s.replace(k, v)
    return s


def clean(s):
    return re.sub(r'\s+', ' ', unlig(s or '').replace('\n', ' ')).strip()


def keep_lines(s):
    return '\n'.join(re.sub(r'[ \t]+', ' ', l).strip() for l in unlig(s or '').split('\n')).strip()


def covering(cells, x, y):
    hits = [c for c in cells if c[0] - .5 <= x <= c[2] + .5 and c[1] - .5 <= y <= c[3] + .5]
    # Smallest rectangle wins when outlines overlap.
    return min(hits, key=lambda c: (c[2] - c[0]) * (c[3] - c[1])) if hits else None


def parse_legend(text):
    """'HTN: hypertension; HF: heart failure, MSSA: ...' -> {ABBR: expansion}.
    Entries are usually separated by ';' but page 10 uses a comma once."""
    legend = {}
    entry = re.compile(r'([A-Z][A-Za-z0-9/\-]*):\s*(.+?)\s*(?=[;,]\s*[A-Z][A-Za-z0-9/\-]*:|;?\s*$)')
    for m in entry.finditer(text):
        legend[m.group(1)] = m.group(2).strip(' ;')
    return legend

pages = []
with pdfplumber.open(pdf_path) as pdf:
    for pno, pg in enumerate(pdf.pages, 1):
        tables = pg.find_tables()
        tb = next((t for t in tables if any(r and clean(r[0]).startswith('Pharmacologic')
                                            for r in t.extract()[:3])), None)
        if tb is None:
            continue
        grid = tb.extract()
        hdr_i = next(i for i, r in enumerate(grid) if r and clean(r[0]).startswith('Pharmacologic'))
        title = ' '.join(clean(c) for c in grid[0] if c) if hdr_i > 0 else clean(pg.extract_text().split('\n')[0])
        hdr = [clean(c) for c in grid[hdr_i]]
        hdr_cells = tb.rows[hdr_i].cells
        cols = []
        for prefix, field in FIELDS:
            j = next(j for j, h in enumerate(hdr) if h.startswith(prefix))
            cols.append((field, j, hdr_cells[j][0], hdr_cells[j][2]))
        rect_text, rect_raw = {}, {}
        for r_i, row in enumerate(tb.rows):
            for c_i, c in enumerate(row.cells):
                if c is not None and grid[r_i][c_i] is not None:
                    rect_text[c] = clean(grid[r_i][c_i])
                    rect_raw[c] = keep_lines(grid[r_i][c_i])
        gcol = cols[1][1]
        rows = []
        for i in range(hdr_i + 1, len(grid)):
            gcell = tb.rows[i].cells[gcol]
            if gcell is None or not clean(grid[i][gcol]):
                continue
            y = (gcell[1] + gcell[3]) / 2
            d, groups, raw = {}, {}, {}
            for field, j, x0, x1 in cols:
                rect = covering(tb.cells, (x0 + x1) / 2, y)
                if rect is None:
                    d[field] = ''
                    continue
                groups[field] = '%.0f,%.0f,%.0f,%.0f' % rect
                if rect[0] < x0 - 1:   # merged in from an earlier column
                    d[field] = ''
                    groups[field] = 'from-left:' + groups[field]
                else:
                    d[field] = rect_text.get(rect, '')
                    raw[field] = rect_raw.get(rect, '')
                    if rect[2] > x1 + 1:
                        groups[field] = 'spans-right:' + groups[field]
            d['groups'] = groups
            d['raw'] = raw
            rows.append(d)
        # Footer: text under the table, minus the revision stamp.
        below = pg.crop((0, tb.bbox[3], pg.width, pg.height))
        foot = clean(below.extract_text())
        foot = clean(re.sub(r'BDK List Revised \w+ \d{4}', '', foot))
        pages.append(dict(page=pno, title=title, legend_raw=foot, legend=parse_legend(foot), rows=rows))

json.dump(pages, open(out_path, 'w'), indent=1, ensure_ascii=False)
for p in pages:
    print(p['page'], p['title'], len(p['rows']), 'drugs |', p['legend_raw'][:110])
print('TOTAL', sum(len(p['rows']) for p in pages))
