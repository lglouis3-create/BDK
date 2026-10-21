"""Build Quizlet decks (BDK QUIZLET DECK SPEC) and the quiz-site data from pages.json.

usage: build.py pages.json pages_prior.json out_dir
Writes, per source page: BDK_p<page>_<Section>_Cards.txt, _SelectALL.txt,
_EssentialKnowledge.txt and (Infectious Diseases pages) _Organisms.txt;
plus decks.json (site data), build_report.md, and a .zip of the decks.
"""
import json, re, sys, os, zipfile, collections
sys.path.insert(0, os.path.dirname(__file__))
from norm import fix

pages_path, prior_path, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PAGES = json.load(open(pages_path))
PRIOR = json.load(open(prior_path))
os.makedirs(OUT, exist_ok=True)

FLAGS = []          # (page, kind, detail) for the "Flag, don't decide" list


def flag(page, kind, detail):
    FLAGS.append((page, kind, detail))


# ---------------------------------------------------------------- names
SECTION = [('DERMATOLOGIC, EARS, EYES, NOSE, THROAT', 'DEENT'), ('CENTRAL NERVOUS SYSTEM', 'CNS'),
           ('CARDIOVASCULAR', 'CV'), ('INFECTIOUS DISEASES', 'ID'), ('GASTROENTEROLOGY', 'GI'),
           ('PAIN, HEMATOLOGY, AND ONCOLOGY', 'PainHemeOnc'), ('ENDOCRINE', 'Endo'),
           ('MUSCULOSKELETAL', 'MSK'), ('PULMONARY', 'Pulmonary'), ('RENAL', 'Renal')]


def section_token(title):
    m = re.match(r'(.*?)\s*(\d*)$', title)
    return dict(SECTION)[m.group(1)] + m.group(2)


# ---------------------------------------------------------------- text helpers
def split_depth0(s, seps):
    """Split on separator characters that sit outside parentheses."""
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth = max(0, depth - 1)
        if ch in seps and depth == 0:
            out.append(cur)
            cur = ''
        else:
            cur += ch
    out.append(cur)
    return [x.strip(' ,;') for x in out if x.strip(' ,;')]


def cap(s):
    """Capitalize the first letter of an answer item."""
    for i, ch in enumerate(s):
        if ch.isalpha():
            return s[:i] + ch.upper() + s[i + 1:]
    return s


def join_names(labels):
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f'{labels[0]} and {labels[1]}'
    return ', '.join(labels[:-1]) + ', and ' + labels[-1]


def numbered(items):
    return '; '.join(f'(#{i}) {x}' for i, x in enumerate(items, 1))


# ---------------------------------------------------------------- abbreviations
# Expansions used when the page footer legend has no entry. Each use is flagged.
OUTSIDE = {
    'CI': 'contraindicated', 'OTC': 'over-the-counter', 'Rx': 'prescription',
    'CS-II': 'controlled substance schedule II', 'CS-III': 'controlled substance schedule III',
    'CS-IV': 'controlled substance schedule IV', 'CS-V': 'controlled substance schedule V',
    'CNS': 'central nervous system', 'QTc': 'corrected QT interval', 'INR': 'international normalized ratio',
    'NSAID': 'nonsteroidal anti-inflammatory drug', 'NSAIDs': 'nonsteroidal anti-inflammatory drugs',
    'COX-2': 'cyclooxygenase-2', 'PDE-5': 'phosphodiesterase-5',
    'HMG-CoA': '3-hydroxy-3-methylglutaryl coenzyme A', 'ARB': 'angiotensin II receptor blocker',
    'CCB': 'calcium channel blocker', 'ACE': 'angiotensin-converting enzyme', 'GLP-1': 'glucagon-like peptide-1',
    'eGFR': 'estimated glomerular filtration rate', 'NYHA': 'New York Heart Association',
    'GI': 'gastrointestinal', 'COVID-19': 'coronavirus disease 2019',
    'INSTIs': 'integrase strand transfer inhibitors', 'MAOI': 'monoamine oxidase inhibitor',
    'HTN': 'hypertension', 'MSSA': 'methicillin-susceptible Staphylococcus aureus',
    'MRSA': 'methicillin-resistant Staphylococcus aureus',
}
# Kept as written, never expanded: routes, enzyme names, units, roman numerals, emphasis.
KEEP = {'PO', 'IV', 'IM', 'SQ', 'SC', 'SL', 'PR', 'INH', 'IT', 'IP', 'IV/IM', 'PO/IV', 'II', 'III', 'IV',
        'NOT', 'US', 'mL', 'QT', 'CYP3A', 'CYP3A4', 'B12', 'D3', 'HT3'}
TOKEN = re.compile(r'(?<![A-Za-z0-9])(?:DVT/PE|[A-Z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*(?:-[A-Z0-9][A-Za-z0-9]*)?'
                   r'|[a-z]+[A-Z][A-Za-z0-9]*|Rx|CS-[IV]+|COX-2|PDE-5|GLP-1|HMG-CoA|COVID-19)'
                   r'(?![A-Za-z0-9])(?!-[A-Z0-9])')
EXPANSIONS_USED = collections.defaultdict(set)   # (abbr, expansion, source) -> pages
UNKNOWN = collections.defaultdict(set)


def expand(text, page):
    legend = page['legend']

    def sub(m):
        t = m.group(0)
        s, e = m.start(), m.end()
        if t in KEEP or re.fullmatch(r'CYP\w+|\d\w+', t):
            return t
        if s > 0 and text[s - 1] == '(':          # already written as "Full term (ABBR)"
            return t
        if t in legend:
            EXPANSIONS_USED[(t, legend[t], 'footer')].add(page['page'])
            return f'{legend[t]} ({t})'
        if t in OUTSIDE:
            EXPANSIONS_USED[(t, OUTSIDE[t], 'outside legend')].add(page['page'])
            return f'{OUTSIDE[t]} ({t})'
        UNKNOWN[t].add(page['page'])
        return t
    if 'QTc interval' in text:   # avoid "corrected QT interval (QTc) interval"
        EXPANSIONS_USED[('QTc', OUTSIDE['QTc'], 'outside legend')].add(page['page'])
        text = text.replace('QTc interval', '\x00')
    return TOKEN.sub(sub, text).replace('\x00', f"{OUTSIDE['QTc']} (QTc)")


# ---------------------------------------------------------------- labels & brands
ROUTE_WORDS = {'po', 'iv', 'im', 'sq', 'sc', 'sl', 'pr', 'inh', 'it', 'ip', 'topical', 'ophthalmic',
               'intranasal', 'transdermal', 'patch', 'inhaled', 'intracatheter'}
ROUTE_PREFIX = re.compile(r'PO/IM|PO/PR|PO/IV|PO, IV|PO, SL|PO, PR|Topical|Transdermal|Intracatheter|'
                          r'Ophthalmic|Patch|PO|IV|IM|SQ|SL')
BRAND_PREFIX = re.compile(r'(?<![A-Za-z])(PO/IM|PO/PR|PO, IV|Topical|Transdermal|Intracatheter|Ophthalmic|'
                          r'Patch|PO|IV|IM|SQ|SL)\s*:\s*')


def is_route_group(inner):
    return all(p.strip().lower() in ROUTE_WORDS for p in inner.split(','))


def strip_routes(generic):
    return re.sub(r'\s*\(([^()]*)\)', lambda m: '' if is_route_group(m.group(1)) else m.group(0), generic).strip(' ,')


def brand_parts(brand, page):
    """[(prefix or '', 'Name1, Name2')] in source order."""
    b = brand.strip()
    if b in ('', '---'):
        return []
    ms = list(BRAND_PREFIX.finditer(b))
    if not ms:
        return [('', b.strip(' ,;'))]
    parts = []
    if ms[0].start() > 0:
        parts.append(('', b[:ms[0].start()].strip(' ,;')))
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(b)
        parts.append((m.group(1), b[m.end():end].strip(' ,;')))
    return parts


def brand_names(parts, page, generic):
    names = []
    for _, txt in parts:
        for n in txt.split(','):
            n = n.strip()
            m = re.match(r'^(.*?)\s*\(([^()]*)\)$', n)
            if m and is_route_group(m.group(2)):
                flag(page, 'brand route suffix dropped in label', f'{generic}: "{n}" -> "{m.group(1)}"')
                n = m.group(1)
            if n and n not in names:
                names.append(n)
    return names


def brand_answer(parts):
    return '; '.join(f'{p}: {t}' if p else t for p, t in parts)


# ---------------------------------------------------------------- per-cell overrides (all flagged)
INDICATION_ITEMS = {   # cells where splitting on commas would cut one indication apart
    'cisplatin (IV, IT, IP)': ['Advanced bladder, ovarian, and testicular cancer', 'various cancers'],
}
CLASS_ITEMS = {        # classification cells that are not "prefix: code"
    'OTC: various omega-3 formulations Rx: Lovaza & Vascepa': ['OTC: various omega-3 formulations', 'Rx: Lovaza & Vascepa'],
}


# ---------------------------------------------------------------- field parsers
def indication_groups(raw_ind):
    """Split an indication cell into (prefix, text) groups using the cell's line breaks."""
    lines = [l.strip() for l in raw_ind.split('\n') if l.strip()]
    groups = []
    for line in lines:
        starts_prefix = re.match(rf'({ROUTE_PREFIX.pattern})\s*:', line)
        new = not groups or starts_prefix or (
            line[:1].isupper() and not groups[-1].rstrip().endswith((',', ';', '-', '/', '('))
            and not re.match(r'^[A-Z0-9]{2,}\b', line))
        if new:
            groups.append(line)
        else:
            groups[-1] += ' ' + line
    out = []
    for g in groups:
        g = fix(g)
        m = re.match(rf'^({ROUTE_PREFIX.pattern})\s*:\s*(.*)$', g)
        out.append((m.group(1), m.group(2)) if m else ('', g))
    return out


def parse_indication(row, page):
    raw = row['raw'].get('indication', '')
    flat = fix(row['indication'])
    activity = ''
    m = re.search(r'Activity against:\s*', flat)
    if m:
        activity = flat[m.end():]
        raw = raw[:raw.find('Activity against')]
        flat = flat[:m.start()]
    gen = fix(row['generic'])
    if gen in INDICATION_ITEMS:
        items = [('', x) for x in INDICATION_ITEMS[gen]]
        flag(page, 'indication split by hand',
             f'{gen}: "{flat}" -> {numbered([cap(x) for _, x in items])} (comma split would cut "Advanced bladder, ovarian, and testicular cancer" into 3)')
    else:
        items = []
        groups = indication_groups(raw) if raw else []
        if len(groups) > 1 and not any(p for p, _ in groups):
            flag(page, 'indication items split at a line break',
                 f'{gen}: ' + ' | '.join(t for _, t in groups))
        for pfx, text in groups:
            for it in split_depth0(text, ',;'):
                items.append((pfx, it))
    return items, activity


def parse_classification(text):
    t = fix(text).strip()
    if not t:
        return []
    if t in CLASS_ITEMS:
        return [('', x) for x in CLASS_ITEMS[t]]
    m = re.match(rf'^({ROUTE_PREFIX.pattern}|[A-Z][A-Za-z ]+?)\s*:\s*(.+)$', t)
    return [(m.group(1), m.group(2))] if m else [('', t)]


EK_LABEL = re.compile(r'(Key Side Effects?|US Boxed Warnings?|Other [Nn]otes?)\s*(\([^)]*\))?\s*:')


def parse_essential(text):
    """[(kind, label_word, qualifier, [items])] in source order; same label+qualifier merged."""
    t = fix(text)
    ms = list(EK_LABEL.finditer(t))
    segs = []
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(t)
        body = t[m.end():end].strip(' ;')
        word = m.group(1)
        kind = 'kse' if word.startswith('Key') else 'bw' if word.startswith('US') else 'notes'
        qual = (m.group(2) or '').strip()
        items = split_depth0(body, ',;') if kind == 'kse' else split_depth0(body, ';')
        segs.append([kind, word, qual, items])
    merged = []
    for s in segs:
        prev = next((x for x in merged if x[0] == s[0] and x[2] == s[2]), None)
        if prev:
            prev[3].extend(s[3])
            prev.append('combined')
        else:
            merged.append(s)
    return merged, t[:ms[0].start()].strip() if ms else t


# ---------------------------------------------------------------- build
SITE = []
REPORT_COUNTS = []
AUDIT = []
ZIP_FILES = []

for page in PAGES:
    pno, title = page['page'], page['title']
    tok = section_token(title)
    rows = page['rows']
    drugs = []
    for r in rows:
        gen = fix(r['generic'])
        parts = brand_parts(fix(r['brand']), pno)
        names = brand_names(parts, pno, gen)
        label = f'{strip_routes(gen)} ({", ".join(names)})' if names else gen
        cat = fix(r['category'])
        ind_items, activity = parse_indication(r, pno)
        cls_items = parse_classification(r['classification'])
        drugs.append(dict(r=r, generic=gen, parts=parts, names=names, label=label, category=cat,
                          ind=ind_items, activity=activity, cls=cls_items))
    labels = [d['label'] for d in drugs]
    dupes = {l for l in labels if labels.count(l) > 1}
    assert not dupes, (pno, dupes)

    def group_of(d, field):
        return d['r']['groups'].get(field, '')

    cards = []   # (file_kind, question, answer, kind, [row indices])
    ix = lambda *ds: [drugs.index(x) for x in ds]

    # ---- Cards file
    done_cls_groups = set()
    for d in drugs:
        if d['parts']:
            cards.append(('Cards', f"What is the brand name of {d['generic']}?", brand_answer(d['parts']), 'brand', ix(d)))
            cards.append(('Cards', f"What is the generic name of {', '.join(d['names'])}?", d['generic'], 'generic', ix(d)))
        if d['category'] == 'See individual drug components':
            flag(pno, 'combination product (category and indication read "See individual drug components")',
                 f"{d['label']}: cards keep that wording; the notes cell is part of the same merged cell, so no Essential Knowledge card")
        if d['category']:
            cards.append(('Cards', f"What is the pharmacologic category of {d['label']}?",
                          cap(expand(d['category'], page)), 'category', ix(d)))
        if d['cls']:
            g = group_of(d, 'classification')
            members = [x for x in drugs if group_of(x, 'classification') == g] if g else [d]
            if g not in done_cls_groups or not g:
                done_cls_groups.add(g)
                items = [(f'{p}: ' if p else '') + cap(expand(t, page)) for p, t in d['cls']]
                who = join_names([x['label'] for x in members])
                if len(members) > 1:
                    flag(pno, 'classification cell merged across drugs (one combined card)',
                         f"{d['r']['classification']}: {who}")
                q = (f'What is the ONLY classification of {who}?' if len(items) == 1
                     else f'What are ALL the classifications of {who}?')
                cards.append(('Cards', q, items[0] if len(items) == 1 else numbered(items), 'classification', ix(*members)))
        if d['ind']:
            items = [(f'{p}: ' if p else '') + cap(expand(t, page)) for p, t in d['ind']]
            q = (f"What is the ONLY common indication of {d['label']}?" if len(items) == 1
                 else f"What are ALL the common indications of {d['label']}?")
            cards.append(('Cards', q, items[0] if len(items) == 1 else numbered(items), 'indication', ix(d)))

    # ---- Select ALL file
    def select_all(field_name, entries, kind):
        """entries: list of (drug, key_text, prefix_note)"""
        groups = collections.OrderedDict()
        for d, key, note in entries:
            groups.setdefault(key, [])
            if not any(x[0] is d for x in groups[key]):
                groups[key].append((d, note))
        for key, members in groups.items():
            if len(members) < 2:
                continue
            if key.startswith('See individual'):
                flag(pno, 'Select ALL group on a placeholder entry',
                     f'"{field_name}: {key}" groups the {len(members)} combination products (made because they share the exact entry)')
            ans = numbered([d['label'] + (f' [{n} only]' if n else '') for d, n in members])
            cards.append(('SelectALL', f'Select ALL drugs with the {field_name}: {key}', ans, kind,
                          ix(*[d for d, _ in members])))

    select_all('pharmacologic category',
               [(d, cap(expand(d['category'], page)), '') for d in drugs if d['category']], 'sa-category')
    cls_entries = []
    for d in drugs:
        for p, t in d['cls']:
            if d['r']['classification'] in CLASS_ITEMS:
                cls_entries.append((d, numbered([cap(expand(x, page)) for _, x in d['cls']]), ''))
                break
            cls_entries.append((d, cap(expand(t, page)), p))
    select_all('classification', cls_entries, 'sa-classification')
    select_all('common indication',
               [(d, cap(expand(t, page)), p) for d in drugs for p, t in d['ind']], 'sa-indication')

    # ---- Essential Knowledge file
    ek_groups = collections.OrderedDict()
    for d in drugs:
        g = group_of(d, 'essential')
        if g.startswith('from-left') or not d['r']['essential']:
            continue
        ek_groups.setdefault(g, []).append(d)
    for g, members in ek_groups.items():
        segs, lead = parse_essential(members[0]['r']['essential'])
        if lead:
            flag(pno, 'essential knowledge text before any label', f'{members[0]["generic"]}: "{lead}"')
        for seg in segs:
            kind, word, qual, items = seg[:4]
            who_members = members
            only = re.match(r'\((?:only for )?([a-z][a-z ]*?)(?:,\s*(.+?))?(?: IV)?\)$', qual)
            if qual and only and len(members) > 1 and not qual.startswith('(all'):
                name, extra = only.group(1), only.group(2)
                who_members = [m for m in members if m['generic'].startswith(name)
                               and (not extra or extra in m['generic'])]
                flag(pno, 'qualified note inside a shared cell',
                     f'"{word} {qual}" assigned to {join_names([m["label"] for m in who_members])} only')
            if len(seg) > 4:
                flag(pno, 'two separate label headings combined into one card',
                     f'{members[0]["generic"]}: two "{word}" headings in one cell')
            who = join_names([m['label'] for m in who_members])
            items = [cap(expand(x, page)) for x in items]
            q_qual = f' {qual}' if qual else ''
            if kind == 'kse':
                q = (f'What is the Key Side Effect{q_qual} of {who}?' if len(items) == 1
                     else f'What are the Key Side Effects{q_qual} of {who}?')
            elif kind == 'bw':
                plural = word.endswith('s')
                q = f'What {"are" if plural else "is"} the US Boxed Warning{"s" if plural else ""}{q_qual} of {who}?'
            else:
                q = (f'What is the Other Note{q_qual} for {who}?' if len(items) == 1
                     else f'What are the Other Notes{q_qual} for {who}?')
            if any(re.search(r'\bIT\b', x) for x in items):
                flag(pno, 'route abbreviation inside a note kept as written',
                     f'{who}: "IT" (page footer: intrathecal) left unexpanded because routes stay as written')
            if any(x.lower().startswith('see above') for x in items):
                flag(pno, '"See above" kept as written', f'{q} -> {"; ".join(items)}')
            cards.append(('EssentialKnowledge', q, '; '.join(items), f'ek-{kind}', ix(*who_members)))

    # ---- Organisms (Infectious Diseases pages)
    if title.startswith('INFECTIOUS DISEASES'):
        org_entries = []
        for d in drugs:
            if not d['activity']:
                continue
            items = []
            for o in split_depth0(d['activity'], ','):
                note = ''
                m = re.match(r'^(.*?)\s*\((\w+) only\)$', o)
                if m:
                    o, note = m.group(1), m.group(2)
                if '/' in o:
                    flag(pno, 'organism entry naming two organisms',
                         f"{d['label']}: \"{o}\" kept as one item, so it does not join the separate MRSA or MSSA Select ALL groups")
                txt = cap(expand(o, page))
                items.append(txt + (f' ({note} only)' if note else ''))
                org_entries.append((d, txt, note))
            q = (f"What is the ONLY organism covered by {d['label']}?" if len(items) == 1
                 else f"What organisms are covered by {d['label']}?")
            cards.append(('Organisms', q, items[0] if len(items) == 1 else numbered(items), 'organism', ix(d)))
        groups = collections.OrderedDict()
        for d, key, note in org_entries:
            groups.setdefault(key, []).append((d, note))
        for key, members in groups.items():
            if len(members) >= 2:
                cards.append(('Organisms', f'Select ALL drugs with activity against: {key}',
                              numbered([d['label'] + (f' [{n} only]' if n else '') for d, n in members]),
                              'sa-organism', ix(*[d for d, _ in members])))

    # ---- write files
    files = collections.OrderedDict()
    for fk in ('Cards', 'SelectALL', 'EssentialKnowledge') + (('Organisms',) if title.startswith('INFECTIOUS') else ()):
        files[fk] = [c for c in cards if c[0] == fk]
    for fk, cs in files.items():
        name = f'BDK_p{pno}_{tok}_{fk}.txt'
        with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as fh:
            for _, q, a, *_ in cs:
                fh.write(f'{q}\t{a}\n')
        ZIP_FILES.append(name)
        REPORT_COUNTS.append((pno, name, len(cs)))

    # ---- audit (per page)
    problems = []
    cards_text = ' '.join(c[1] for c in files['Cards'])
    ek_text = ' '.join(c[1] for c in files['EssentialKnowledge'])
    for d in drugs:
        if d['label'] not in cards_text and d['generic'] not in cards_text:
            problems.append(f'not in Cards: {d["label"]}')
        if d['label'] not in ek_text:
            problems.append(f'not in EssentialKnowledge: {d["label"]}')
    for fk, cs in files.items():
        qs = [c[1] for c in cs]
        for q in {q for q in qs if qs.count(q) > 1}:
            problems.append(f'{fk}: duplicate question "{q}"')
        for _, q, a, *_ in cs:
            line = f'{q}\t{a}'
            if line.count('\t') != 1 or '\n' in line or '\r' in line:
                problems.append(f'{fk}: tab/line break inside card "{q[:60]}"')
            if not q.strip() or not a.strip():
                problems.append(f'{fk}: empty field "{q[:60]}"')
            if '@' in line:
                problems.append(f'{fk}: "@" in "{q[:60]}"')
            n = len(re.findall(r'\(#\d+\)', a))
            if ' ONLY ' in f' {q} ' and n:
                problems.append(f'{fk}: ONLY but {n} numbered items: "{q[:60]}"')
            if ' ALL ' in f' {q} ' and not q.startswith('Select ALL') and n < 2:
                problems.append(f'{fk}: ALL but {n} items: "{q[:60]}"')
            if q.startswith('Select ALL') and n < 2:
                problems.append(f'{fk}: Select ALL group with {n} drug(s): "{q[:60]}"')
    AUDIT.append((pno, tok, len(drugs), problems))

    SITE.append(dict(page=pno, title=title, short=tok, legend=page['legend_raw'],
                     drugs=[dict(generic=d['generic'], brand=brand_answer(d['parts']) or '---',
                                 category=d['category'], classification=fix(d['r']['classification']),
                                 indication=fix(d['r']['indication']).split(' Activity against:')[0],
                                 activity=d['activity'], essential=fix(d['r']['essential']),
                                 label=d['label']) for d in drugs],
                     cards=[dict(f=fk, q=q, a=a, k=k, d=di) for fk, q, a, k, di in cards]))

json.dump(dict(edition='2026-2027 (BDK List Revised May 2026)', pages=SITE),
          open(os.path.join(OUT, 'decks.json'), 'w'), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- unusual spellings kept as written
SPELLINGS = ['cyclosporin', 'Enterobacteriacae', 'PreP', 'insomnia. diaphoresis', 'PO: Aricept,',
             'streptococcus species', 'Lactulose', 'Calcium acetate', 'Keytruda(IV)']
for page in PAGES:
    blob = json.dumps(page['rows'], ensure_ascii=False)
    for s in SPELLINGS:
        if s in blob:
            flag(page['page'], 'kept as written', s)

# ---------------------------------------------------------------- prior-year differences
def keyname(g):
    return re.sub(r'\s+', ' ', strip_routes(fix(g)).lower())


DIFFS = collections.defaultdict(list)
prior_by_title = {p['title']: p for p in PRIOR}
for page in PAGES:
    old = prior_by_title.get(page['title'])
    if not old:
        DIFFS[page['page']].append('section not in prior-year list')
        continue
    o = {keyname(r['generic']): r for r in old['rows']}
    n = {keyname(r['generic']): r for r in page['rows']}
    for k in n.keys() - o.keys():
        DIFFS[page['page']].append(f'added: {fix(n[k]["generic"])}')
    for k in o.keys() - n.keys():
        DIFFS[page['page']].append(f'removed: {fix(o[k]["generic"])}')
    for k in n.keys() & o.keys():
        for f in ('generic', 'brand', 'category', 'classification', 'indication', 'essential'):
            a, b = fix(o[k][f]), fix(n[k][f])
            if a != b:
                DIFFS[page['page']].append(f'{fix(n[k]["generic"])} — {f}: "{a}" → "{b}"')

# ---------------------------------------------------------------- report + zip
with open(os.path.join(OUT, 'build_report.md'), 'w', encoding='utf-8', newline='\n') as fh:
    W = fh.write
    W('# BDK Quizlet deck build report\n\nSource: 2026-2027 Basic Drug Knowledge List ("BDK List Revised May 2026"), pages 2-27.\n\n')
    W('## Card counts per file\n\n| Page | File | Cards |\n| --- | --- | ---: |\n')
    for pno, name, n in REPORT_COUNTS:
        W(f'| {pno} | {name} | {n} |\n')
    W(f'\nTotal cards: {sum(n for _, _, n in REPORT_COUNTS)} in {len(REPORT_COUNTS)} files.\n\n')
    W('## Audit (run in code)\n\n')
    for pno, tok, n, probs in AUDIT:
        W(f'- p{pno} {tok} ({n} drugs): ' + ('passed' if not probs else f'{len(probs)} problem(s)') + '\n')
        for p in probs:
            W(f'  - {p}\n')
    W('\n## Abbreviation expansions\n\n| Abbreviation | Written as | Source | Pages |\n| --- | --- | --- | --- |\n')
    for (a, e, src), pgs in sorted(EXPANSIONS_USED.items(), key=lambda x: (x[0][2] != 'outside legend', x[0][0].lower())):
        W(f'| {a} | {e} ({a}) | {"**FLAGGED: outside legend**" if src != "footer" else "page footer"} | {", ".join(map(str, sorted(pgs)))} |\n')
    if UNKNOWN:
        W('\n**Not expanded (no expansion on file):** ' + '; '.join(f'{t} (p{", ".join(map(str, sorted(p)))})' for t, p in sorted(UNKNOWN.items())) + '\n')
    W('\nKept as written, not expanded: routes (PO, IV, IM, SQ, SC, SL, PR, INH, IT, IP), enzyme names (CYP3A, CYP3A4, 2B6, 2C19, 2D6), QT, mL.\n')
    W('\n## Flags for Louis to decide\n\n')
    by_kind = collections.OrderedDict()
    for pno, kind, detail in FLAGS:
        by_kind.setdefault(kind, []).append((pno, detail))
    for kind, items in by_kind.items():
        W(f'### {kind}\n\n')
        seen = set()
        for pno, detail in items:
            if (pno, detail) in seen:
                continue
            seen.add((pno, detail))
            W(f'- p{pno}: {detail}\n')
        W('\n')
    W('## Differences from the 2025-2026 list\n\n')
    for pno in sorted(DIFFS):
        W(f'### p{pno} {next(p["title"] for p in PAGES if p["page"] == pno)}\n\n')
        for d in DIFFS[pno]:
            W(f'- {d}\n')
        W('\n')

with zipfile.ZipFile(os.path.join(OUT, 'BDK_2026-2027_Quizlet_Decks.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for name in ZIP_FILES + ['build_report.md']:
        z.write(os.path.join(OUT, name), name)

print('files', len(ZIP_FILES), 'cards', sum(n for _, _, n in REPORT_COUNTS))
print('audit problems', sum(len(p) for *_, p in AUDIT))
print('flags', len(FLAGS), 'unknown abbreviations', dict(UNKNOWN))
