"""Undo PDF text-extraction artifacts. Nothing here changes the table's wording.

Fixes cover: subscripts that pdfplumber moves to the end of a phrase
("Alpha agonist 2" for Alpha2 agonist), hyphens and slashes followed by a
line break ("Second- generation"), and the displaced "12" of vitamin B12.
"""
import re

FIXES = [
    ('Alpha agonist, 2 sedative', 'Alpha2 agonist, sedative'),
    ('Alpha agonist 2', 'Alpha2 agonist'),
    ('Alpha antagonist 2', 'Alpha2 antagonist'),
    ('Selective alpha 2a agonist', 'Selective alpha2a agonist'),
    ('Alpha blocker 1a', 'Alpha1a blocker'),
    ('Alpha blocker 1', 'Alpha1 blocker'),
    ('Beta agonist 3', 'Beta3 agonist'),
    ('Beta -selective beta- 1 blocker', 'Beta1-selective beta-blocker'),
    ('and alpha 1 blocker', 'and alpha1 blocker'),
    ('Beta , beta, and alpha 1 2 1 agonist', 'Beta1, beta2, and alpha1 agonist'),
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
    ('vitamin B deficiency, hypomagnesemia, increased risk of 12 Clostridioides',
     'vitamin B12 deficiency, hypomagnesemia, increased risk of Clostridioides'),
]
# "Second- generation", "non- opioid": a hyphen at a line break, then the word continues.
HYPHEN = re.compile(r'(?<=[A-Za-z])- (?=[a-z])')
SLASH = re.compile(r'(?<=[A-Za-z])/ (?=[a-z])')


def fix(s):
    for a, b in FIXES:
        s = s.replace(a, b)
    s = HYPHEN.sub('-', s)
    return SLASH.sub('/', s)

