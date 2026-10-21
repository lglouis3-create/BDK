"""Turn raw.json (pdfplumber output) into the quiz data file.

Every change to source text is an explicit fix listed here, so nothing in the
quiz differs from the PDF except extraction artifacts (displaced subscripts,
line-break hyphens, a font ligature, and merged-column text).
"""
import json, re, sys

raw = json.load(open(sys.argv[1]))
out_path = sys.argv[2]

# Literal substring fixes, applied to every text field.
FIXES = [
    ('(cid:332)', 'ft'),                       # "Ce(cid:332)in" -> Ceftin
    ('Alpha agonist, 2 sedative', 'Alpha2 agonist, sedative'),
    ('Alpha agonist 2', 'Alpha2 agonist'),
    ('Alpha antagonist 2', 'Alpha2 antagonist'),
    ('Selective alpha 2a agonist', 'Selective alpha2a agonist'),
    ('Alpha blocker 1a', 'Alpha1a blocker'),
    ('Alpha blocker 1', 'Alpha1 blocker'),
    ('Beta agonist 3', 'Beta3 agonist'),
    ('Beta -selective beta- 1 blocker', 'Beta1-selective beta-blocker'),
    ('and alpha 1 blocker', 'and alpha1 blocker'),
    ('Beta , beta , and alpha 1 2 1 agonist', 'Beta1, beta2, and alpha1 agonist'),
    ('Alpha agonist 1 (predominantly), beta 1 and beta agonist 2',
     'Alpha1 agonist (predominantly), beta1 and beta2 agonist'),
    ('long-acting beta 2 agonist', 'long-acting beta2 agonist'),
    ('long-acting beta agonist 2', 'long-acting beta2 agonist'),
    ('Short-acting beta agonist 2', 'Short-acting beta2 agonist'),
    ('Histamine (H ) 1', 'Histamine (H1)'),
    ('Histamine (H ) 2', 'Histamine (H2)'),
    ('Dopamine (D ) 2', 'Dopamine (D2)'),
    ('(5-HT ) 3', '(5-HT3)'),
    ('Sodium-glucose cotransporter inhibitor 2', 'Sodium-glucose cotransporter 2 inhibitor'),
    ('cyanocobalamin (vitamin B ) (PO, 12 IM, SL, intranasal)',
     'cyanocobalamin (vitamin B12) (PO, IM, SL, intranasal)'),
    ('Vitamin B 12 deficiency', 'Vitamin B12 deficiency'),
    ('OTC: available Rx: Lovaza & Vascepa', 'OTC: available; Rx: Lovaza & Vascepa'),
    ('Elevated IOP Ocular redness', 'Elevated IOP; ocular redness'),
    ('Transdermal: topical analgesic IV: antiarrhythmic', 'Transdermal: topical analgesic; IV: antiarrhythmic'),
    ('Transdermal: Lidoderm, IV: Xylocaine', 'Transdermal: Lidoderm; IV: Xylocaine'),
    ('Transdermal: pain, IV: ventricular arrhythmias', 'Transdermal: pain; IV: ventricular arrhythmias'),
    ('Transdermal: Duragesic, IV: Sublimaze', 'Transdermal: Duragesic; IV: Sublimaze'),
    ('PO/PR: Tylenol, IV: Ofirmev', 'PO/PR: Tylenol; IV: Ofirmev'),
    ('Topical: Cortaid IV: Solu-Cortef', 'Topical: Cortaid; IV: Solu-Cortef'),
    ('Topical: Inflammation, rash PO/IV: Acute illness', 'Topical: inflammation, rash; PO/IV: acute illness'),
    ('SQ: Ozempic, Wegovy PO: Rybelsus, Wegovy', 'SQ: Ozempic, Wegovy; PO: Rybelsus, Wegovy'),
    ('PO: Risperdal IM: Risperdal Consta', 'PO: Risperdal; IM: Risperdal Consta'),
    ('PO: Ambien, Ambien CR SL: Edluar', 'PO: Ambien, Ambien CR; SL: Edluar'),
    ('IV: Zinacef, PO: Ceftin', 'IV: Zinacef; PO: Ceftin'),
    ('PO: Catapres, Transdermal: Catapres-TTS', 'PO: Catapres; Transdermal: Catapres-TTS'),
    ('PO: Ditropan XL, Patch: Oxytrol', 'PO: Ditropan XL; Patch: Oxytrol'),
    ('Intracatheter: Cathflo Activase, IV: Activase', 'Intracatheter: Cathflo Activase; IV: Activase'),
    ('Intracatheter: catheter clearance IV: STEMI', 'Intracatheter: catheter clearance; IV: STEMI'),
    ('Ophthalmic: Vigamox, PO, IV: Avelox', 'Ophthalmic: Vigamox; PO, IV: Avelox'),
    ('Ophthalmic: bacterial conjunctivitis, PO, IV: CAP', 'Ophthalmic: bacterial conjunctivitis; PO, IV: CAP'),
    ('IV: SSTI, HAP, meningitis, endocarditis, CRBSI PO: CDI', 'IV: SSTI, HAP, meningitis, endocarditis, CRBSI; PO: CDI'),
    ('Topical: Neosporin Ophthalmic: Neo-Polycin', 'Topical: Neosporin; Ophthalmic: Neo-Polycin'),
    ('Topical infection prevention Ocular infections', 'Topical infection prevention; ocular infections'),
    ('Transdermal: Climera, Vivelle Dot PO: Estrace', 'Transdermal: Climera, Vivelle Dot; PO: Estrace'),
    ('PO: Concerta, Ritalin Patch: Daytrana', 'PO: Concerta, Ritalin; Patch: Daytrana'),
    ('PO: Aricept, Transdermal: Adlarity', 'PO: Aricept; Transdermal: Adlarity'),
    ('PO: HTN, IV: hypertensive crisis', 'PO: HTN; IV: hypertensive crisis'),
]
# Line-break hyphens that pdfplumber kept with a trailing space ("Second- generation").
HYPHEN = re.compile(r'(?<=[A-Za-z])- (?=[a-z]|dopamine|norepinephrine|aspartate|resistant)')

def fix(s):
    for a, b in FIXES:
        s = s.replace(a, b)
    return HYPHEN.sub('-', s)

def split_activity(ind):
    m = re.search(r'\s*Activity against:\s*', ind)
    return (ind[:m.start()], ind[m.end():]) if m else (ind, '')

def essential_lines(text, generic):
    parts = re.split(r'\s*(?=Key Side Effects|US Boxed Warning|Other [Nn]otes)', text)
    keep = []
    for p in (p.strip() for p in parts):
        # A merged notes cell covers a whole group; "(only for X)" lines belong to X alone.
        only = re.search(r'\(only for ([^)]*)\)', p)
        if only:
            name, *qual = [w.strip() for w in only.group(1).split(',')]
            if not generic.startswith(name) or any(q not in generic for q in qual):
                continue
        if p:
            keep.append(p)
    return keep

ORDER = ['DERMATOLOGIC, EARS, EYES, NOSE, THROAT 1', 'DERMATOLOGIC, EARS, EYES, NOSE, THROAT 2',
         'PULMONARY', 'RENAL', 'CARDIOVASCULAR 1', 'CARDIOVASCULAR 2', 'CARDIOVASCULAR 3',
         'CARDIOVASCULAR 4', 'INFECTIOUS DISEASES 1', 'INFECTIOUS DISEASES 2', 'INFECTIOUS DISEASES 3',
         'INFECTIOUS DISEASES 4', 'MUSCULOSKELETAL', 'ENDOCRINE 1', 'ENDOCRINE 2', 'ENDOCRINE 3',
         'CENTRAL NERVOUS SYSTEM 1', 'CENTRAL NERVOUS SYSTEM 2', 'CENTRAL NERVOUS SYSTEM 3',
         'CENTRAL NERVOUS SYSTEM 4', 'CENTRAL NERVOUS SYSTEM 5', 'GASTROENTEROLOGY 1',
         'GASTROENTEROLOGY 2', 'PAIN, HEMATOLOGY, AND ONCOLOGY 1', 'PAIN, HEMATOLOGY, AND ONCOLOGY 2',
         'PAIN, HEMATOLOGY, AND ONCOLOGY 3']
SHORT = {'DERMATOLOGIC, EARS, EYES, NOSE, THROAT': 'DEENT', 'CENTRAL NERVOUS SYSTEM': 'CNS',
         'CARDIOVASCULAR': 'CV', 'INFECTIOUS DISEASES': 'ID', 'GASTROENTEROLOGY': 'GI',
         'PAIN, HEMATOLOGY, AND ONCOLOGY': 'Pain/Heme/Onc', 'ENDOCRINE': 'Endocrine',
         'MUSCULOSKELETAL': 'Musculoskeletal', 'PULMONARY': 'Pulmonary', 'RENAL': 'Renal'}

by_title = {s['title']: s for s in raw}
assert sorted(by_title) == sorted(ORDER), set(by_title) ^ set(ORDER)
sections, n = [], 0
for title in ORDER:
    s = by_title[title]
    m = re.match(r'(.*?)\s*(\d)?$', title)
    short = SHORT[m.group(1)] + (' ' + m.group(2) if m.group(2) else '')
    drugs = []
    for d in s['drugs']:
        d = {k: fix(v) for k, v in d.items()}
        ind, activity = split_activity(d['indication'])
        combo = d['category'] == 'See individual drug components'
        n += 1
        drugs.append(dict(
            id=n,
            category='' if combo else d['category'],
            generic=d['generic'],
            brand='' if d['brand'] == '---' else d['brand'],
            classification=d['classification'],
            indication='' if combo else ind.rstrip('.'),
            activity=activity,
            notes=(['Combination product: see individual drug components.'] if combo else [])
                  + essential_lines(d['essential'], d['generic']),
        ))
    sections.append(dict(id=short.lower().replace('/', '-').replace(' ', '-'), name=short,
                         title=title, edition=s['edition'], source=s['source'], drugs=drugs))

leftover = [(s['name'], k, d[k]) for s in sections for d in s['drugs'] for k in
            ('category', 'generic', 'brand', 'classification', 'indication')
            if re.search(r'\(cid:|\( \)|\b[A-Za-z]+ \d\b(?! (?:DM|weeks|hours|years))|- [a-z]', d[k])]
for x in leftover:
    print('CHECK', x)
json.dump(dict(sections=sections), open(out_path, 'w'), indent=1, ensure_ascii=False)
print(len(sections), 'sections', n, 'drugs')
