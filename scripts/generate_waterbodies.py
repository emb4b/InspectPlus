#!/usr/bin/env python3
"""Regenerate src/data/mimaropaWaterbodies.ts from EMB's classified-waterbodies PDF.

The source PDF's text layer is row-misaligned: a naive `pdftotext -layout`
pairs a river with a classification belonging to a different row, which
would be invisible in the app and would misstate which effluent standards
apply. This script makes one coordinate-based pass with pdfplumber -- words
are clustered into visual lines and assigned to columns by x-position bands
taken from each page's header row -- and then refuses to write unless a set
of gates pass.

What the gates guard, all against figures printed in the PDF's own
CLASSIFICATION STAT summary rather than computed here:

  - dropped or duplicated rows (total waterbody count, per-province counts);
  - the total number of classification tokens across all rows;
  - the per-class histogram (how many rows carry AA, A, B, ... SD);
  - section headings bleeding into a name band;
  - vocabulary (no province outside the five, no blank name/class).

What the gates CANNOT catch: a permutation. If two rows swap their
classifications, every count above is unchanged and the file is written
with both rows wrong. The 2020 pairing was verified at authoring time by a
manual diff against an independent table-mode extraction; that check is not
encoded here. So when regenerating against a new EMB list, after the script
writes, open the PDF and cross-check a sample of rows -- including every
multi-line name and every multi-class row -- against the emitted file by
hand, and update the EXPECT_* constants from the new summary table first.

Not part of the app or its test run. Needs `pdfplumber` (pip install
pdfplumber) and is run by hand when EMB publishes an updated list:

    python scripts/generate_waterbodies.py path/to/waterbodies.pdf
"""
import re
import sys
from pathlib import Path

import pdfplumber

OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'mimaropaWaterbodies.ts'
PROVINCES = ['Occidental Mindoro', 'Oriental Mindoro', 'Marinduque', 'Romblon', 'Palawan']
GROUPS = [('principal', 'Principal Rivers'), ('minor', 'Minor Rivers'), ('other', 'Other Waterbodies')]
TABLE_HEADINGS = [('PRINCIPAL RIVERS', 'principal'), ('MINOR RIVERS', 'minor'), ('OTHER WATERBODIES', 'other')]
SKIP = ('ENVIRONMENTAL MANAGEMENT', 'MIMAROPA Region', 'ambient files', 'Note:', 'CLASSIFICATION STAT',
        'Total Number', 'Classifications', 'Assigned', 'PRINCIPAL RIVERS', 'MINOR RIVERS',
        'OTHER WATERBODIES', 'For Classification')

# Expected totals, read off the PDF's own summary table. Update these when the
# source document changes -- that is the point of the check.
EXPECT_TOTAL = 102
EXPECT_CLASSIFICATIONS = 125
EXPECT_PER_PROVINCE = {'Occidental Mindoro': 13, 'Oriental Mindoro': 24,
                       'Marinduque': 8, 'Romblon': 7, 'Palawan': 50}
# The summary's own per-class row. Update these when the source changes.
# This catches token-level corruption (a class read as another, a class
# dropped or doubled in one row) that the total above would miss when two
# such errors cancel out. It still cannot catch two rows swapping their
# classifications -- see the module docstring for the manual cross-check.
EXPECT_PER_CLASS = {'AA': 1, 'A': 24, 'B': 19, 'C': 51, 'D': 3,
                    'SA': 4, 'SB': 14, 'SC': 9, 'SD': 0}

# Section-heading tokens that have been observed (or could plausibly) bleed
# into a name band during coordinate-based extraction. A name containing one
# of these is almost certainly corrupted, not a legitimate waterbody name.
NAME_ARTIFACT_TOKENS = ('WATERBODY', 'WATERBODIES', 'CLASSIFICATION', 'For Classification',
                         'PRINCIPAL RIVERS', 'MINOR RIVERS')


def lines_of(page):
    """Cluster a page's words into visual lines, left to right."""
    words = sorted(page.extract_words(keep_blank_chars=False), key=lambda w: (round(w['top'], 1), w['x0']))
    out, cur = [], []
    for w in words:
        if cur and w['top'] - cur[0]['top'] > 4:
            out.append(sorted(cur, key=lambda x: x['x0']))
            cur = []
        cur.append(w)
    if cur:
        out.append(sorted(cur, key=lambda x: x['x0']))
    return out


def header_cols(line):
    """x-positions of the NAME/LOCATION/CLASSIFICATION/YEAR columns, if this line is the header."""
    text = ' '.join(w['text'] for w in line)
    if not ('LOCATION' in text and 'CLASSIFICATION' in text and 'NAME' in text):
        return None
    at = {w['text']: w['x0'] for w in line}
    cols = (at.get('NAME'), at.get('LOCATION'), at.get('CLASSIFICATION'), at.get('YEAR'))
    return cols if all(c is not None for c in cols) else None


def extract(pdf_path):
    records, table, province, cols = [], None, None, None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            lines = lines_of(page)
            for line in lines:  # a repeated header re-fixes the column geometry
                cols = header_cols(line) or cols
            starts = []
            for i, line in enumerate(lines):
                text = ' '.join(w['text'] for w in line).strip()
                for heading, key in TABLE_HEADINGS:
                    if heading in text:
                        table = key
                if text.startswith('Province of'):
                    province = text.split('Province of', 1)[1].strip()
                    continue
                if header_cols(line) or any(text.startswith(s) for s in SKIP):
                    continue
                if re.match(r'^\d+\.$|^\d+\.\S', line[0]['text']):
                    starts.append((i, table, province))
            if not cols:
                continue
            name_x0, loc_x0, cls_x0, year_x0 = cols
            for n, (i, tbl, prov) in enumerate(starts):
                end = starts[n + 1][0] if n + 1 < len(starts) else len(lines)
                name, classification = [], []
                for line in lines[i:end]:  # the whole vertical band, so wrapped values survive
                    text = ' '.join(w['text'] for w in line).strip()
                    if text.startswith('Province of') or header_cols(line) or any(text.startswith(s) for s in SKIP):
                        continue
                    for w in line:
                        if re.match(r'^\d+\.$', w['text']):
                            continue
                        mid = (w['x0'] + w['x1']) / 2
                        if name_x0 - 6 <= mid < loc_x0 - 6:
                            name.append(w['text'])
                        elif cls_x0 - 6 <= mid < year_x0 - 6:
                            classification.append(w['text'])
                records.append({'table': tbl, 'province': prov,
                                'name': ' '.join(name).strip(),
                                'classification': ' '.join(classification).strip()})
    return records


def clean(records):
    for r in records:
        r['name'] = re.sub(r'\s+', ' ', r['name']).strip()
        # Extraction artifact: the next table's section heading sometimes
        # bleeds into the preceding row's name band. Strip it the same way
        # it's already stripped from the classification field below.
        r['name'] = re.sub(r'\s+(For|WATERBODY)$', '', r['name'])
        cls = re.sub(r'\s*,\s*', ', ', re.sub(r'\s+', ' ', r['classification']).strip())
        cls = re.sub(r'\s+(For|WATERBODY)$', '', cls)
        # A column-duplication artifact in the source: three rows repeat their
        # last class. The classification-count check below is what catches it.
        if cls == 'A, B, B':
            cls = 'A, B'
        r['classification'] = cls
        # Flatten a nested qualifier so the rendered value doesn't nest parens:
        # 'SC (brackish mangrove)' -> 'SC, brackish mangrove'.
        r['value'] = '{} ({})'.format(r['name'], re.sub(r'\s*\((.*)\)\s*$', r', \1', cls))
    return records


def class_tokens(record):
    """The bare class tokens of one row, qualifier stripped: 'SC (brackish mangrove)' -> ['SC']."""
    return re.split(r',\s*', re.sub(r'\s*\(.*', '', record['classification']))


def verify(records):
    problems = []
    if len(records) != EXPECT_TOTAL:
        problems.append('waterbody count {}, expected {}'.format(len(records), EXPECT_TOTAL))
    tokens = sum(len(class_tokens(r)) for r in records)
    if tokens != EXPECT_CLASSIFICATIONS:
        problems.append('classification count {}, expected {}'.format(tokens, EXPECT_CLASSIFICATIONS))
    histogram = {}
    for r in records:
        for tok in class_tokens(r):
            histogram[tok] = histogram.get(tok, 0) + 1
    for cls in sorted(set(histogram) | set(EXPECT_PER_CLASS)):
        got, expected = histogram.get(cls, 0), EXPECT_PER_CLASS.get(cls)
        if expected is None:
            problems.append('class {!r} is not in the summary vocabulary ({} row(s))'.format(cls, got))
        elif got != expected:
            problems.append('class {} appears {} time(s), expected {}'.format(cls, got, expected))
    for province, expected in EXPECT_PER_PROVINCE.items():
        got = sum(1 for r in records if r['province'] == province)
        if got != expected:
            problems.append('{} has {} waterbodies, expected {}'.format(province, got, expected))
    unknown = {r['province'] for r in records} - set(EXPECT_PER_PROVINCE)
    if unknown:
        problems.append('unexpected provinces: {}'.format(sorted(unknown)))
    blank = [r for r in records if not r['name'] or not r['classification']]
    if blank:
        problems.append('{} record(s) missing a name or classification'.format(len(blank)))
    # None of the counts above inspect an individual name, so a section
    # heading bleeding into a name band (e.g. 'Balanacan River WATERBODY')
    # would otherwise slip through undetected. Catch it explicitly.
    tainted = [r for r in records if any(tok in r['name'] for tok in NAME_ARTIFACT_TOKENS)]
    if tainted:
        problems.append('{} record(s) have a section-heading artifact in the name: {}'.format(
            len(tainted), sorted(r['name'] for r in tainted)))
    return problems


def ts_str(value):
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def render(records):
    lines = [
        "// Bundled offline dataset (province -> waterbody group -> options) of the",
        "// receiving bodies of water an outlet can discharge into, for EMB Region 4-B",
        "// (MIMAROPA). Sourced from EMB's \"2020 Updated List of Waterbodies Classified",
        "// and Monitored\" (January 2020) and scoped to the same five provinces as",
        "// src/data/mimaropaLocations.ts. Bundled at build time (not fetched at",
        "// runtime) since the app is offline-first.",
        "//",
        "// GENERATED by scripts/generate_waterbodies.py - do not edit by hand. The",
        "// generator refuses to write unless its counts match the totals printed in",
        "// the source PDF's own summary table, so a hand edit here is unverified.",
        "//",
        "// Each option is \"Name (Classification)\" - the classification is what",
        "// determines the effluent standards an outlet is held to, so it travels with",
        "// the name rather than being looked up separately.",
        "export interface WaterbodyGroup {",
        "  label: string;",
        "  options: string[];",
        "}",
        "",
        "export const WATERBODIES: Record<string, WaterbodyGroup[]> = {",
    ]
    for province in PROVINCES:
        lines.append('  {}: ['.format(ts_str(province)))
        for key, label in GROUPS:
            options = sorted((r['value'] for r in records
                              if r['province'] == province and r['table'] == key), key=str.lower)
            if not options:
                continue
            lines.append("    {{ label: '{}', options: [".format(label))
            lines.extend('      {},'.format(ts_str(o)) for o in options)
            lines.append('    ] },')
        lines.append('  ],')
    lines += ['};', '']
    return '\n'.join(lines)


def main():
    if len(sys.argv) != 2:
        sys.exit('usage: {} <path to waterbodies pdf>'.format(Path(sys.argv[0]).name))
    records = clean(extract(sys.argv[1]))
    problems = verify(records)
    if problems:
        print('Refusing to write - the extraction does not match the PDF summary:', file=sys.stderr)
        for p in problems:
            print('  - {}'.format(p), file=sys.stderr)
        sys.exit(1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render(records), encoding='utf-8')
    print('Wrote {} - {} waterbodies across {} provinces.'.format(OUT, len(records), len(EXPECT_PER_PROVINCE)))


if __name__ == '__main__':
    main()
