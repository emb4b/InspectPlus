import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { mapBundle } from '../mappers';
import { fullWaterBundle, signatories } from '../mappers/fixtures';
import type { TemplateData } from '../types';

const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', '..', 'assets', 'templates');
const ctx = { signatories };

// Every template's tags must be exactly the keys its mapper produces — a
// tag with no data prints "", a key with no tag is silently lost, and both
// are the failure mode of a re-tag after EMB revises a form.
function tagsOf(file: string) {
  const xml = new PizZip(fs.readFileSync(path.join(TEMPLATES_DIR, file))).file('word/document.xml')!.asText();
  const text = xml.replace(/<[^>]+>/g, '');
  const plain = new Set<string>();
  const loops = new Set<string>();
  const raw = new Set<string>();
  for (const m of text.matchAll(/\{([#/@]?)([A-Za-z0-9_]+)\}/g)) {
    if (m[1] === '#' || m[1] === '/') loops.add(m[2]);
    else if (m[1] === '@') raw.add(m[2]);
    else plain.add(m[2]);
  }
  return { plain, loops, raw };
}

// Keys at every level of the data: top-level strings, loop names, and the
// string keys inside loop rows (which is where docxtemplater resolves them).
function keysOf(data: TemplateData) {
  const plain = new Set<string>();
  const loops = new Set<string>();
  const walk = (d: TemplateData) => {
    for (const [k, v] of Object.entries(d)) {
      if (Array.isArray(v)) {
        loops.add(k);
        v.forEach(walk);
      } else plain.add(k);
    }
  };
  walk(data);
  plain.delete('photo_id');
  plain.delete('photo_missing_text');
  return { plain, loops };
}

const cases: [string, TemplateData][] = [
  ['Water Monitoring.docx', mapBundle(fullWaterBundle(), ctx)],
  // Task 13 adds: Air Monitoring, EIA, Hazardous Waste Generators (mapCommon), Survey (mapSurvey)
];

describe.each(cases)('%s', (file, data) => {
  const tags = tagsOf(file);
  const keys = keysOf(data);

  it('has no tag the mapper does not fill', () => {
    expect([...tags.plain].filter(t => !keys.plain.has(t)).sort()).toEqual([]);
    expect([...tags.loops].filter(t => !keys.loops.has(t)).sort()).toEqual([]);
  });
  it('prints every key the mapper produces', () => {
    expect([...keys.plain].filter(k => !tags.plain.has(k)).sort()).toEqual([]);
    expect([...keys.loops].filter(k => !tags.loops.has(k)).sort()).toEqual([]);
  });
  it('uses the photo drawing raw tag', () => {
    expect([...tags.raw]).toEqual(['photo_drawing']);
  });
});
