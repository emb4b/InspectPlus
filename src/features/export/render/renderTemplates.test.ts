import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { renderDocx } from './renderDocx';
import { mapBundle } from '../mappers';
import { emptyWaterBundle, fullSurveyBundle, fullWaterBundle, signatories } from '../mappers/fixtures';
import { TICKED } from '../mappers/primitives';
// scripts/docx-tag.js is a plain Node script, not part of the app bundle —
// Jest transpiles it like any other CommonJS module, and templates/index.ts
// already imports the sibling .docx assets the same require()-based way.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertWellFormed } = require('../../../../scripts/docx-tag');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', '..', 'assets', 'templates');
const ctx = { signatories };
const load = (file: string) => new Uint8Array(fs.readFileSync(path.join(TEMPLATES_DIR, file)));
const docXml = (bytes: Uint8Array) => new PizZip(bytes).file('word/document.xml')!.asText();
const png1x1 = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));

// Finds the <w:tc>…</w:tc> that contains `primaryInspectorName` (unique to
// the "Submitted by" cell) and returns the plain text of each of its
// paragraphs from the primary inspector's name onward — the cell's own two
// blank spacing paragraphs above the printed name are skipped, leaving just
// the sig_inspectors loop's output. Used to assert name and position land in
// separate paragraphs per inspector rather than being glued together inside
// one (see the inline-loop bug this guards against).
function submittedByParagraphs(xml: string, primaryInspectorName: string): string[] {
  const i = xml.indexOf(primaryInspectorName);
  expect(i).toBeGreaterThanOrEqual(0);
  const tcStart = xml.lastIndexOf('<w:tc>', i);
  const tcEnd = xml.indexOf('</w:tc>', i) + '</w:tc>'.length;
  const tc = xml.slice(tcStart, tcEnd);
  const paragraphs = [...tc.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map(m => m[0].replace(/<[^>]+>/g, ''));
  const start = paragraphs.indexOf(primaryInspectorName);
  expect(start).toBeGreaterThanOrEqual(0);
  return paragraphs.slice(start);
}

// A checked-in template with a malformed document.xml (e.g. the EIA
// checkbox-unwrap bug that produced a mismatched-tag document) would break
// silently until someone opened the output in Word — assert every source
// template, and every render of it, parses as well-formed XML.
const CHECKED_IN_TEMPLATES = [
  'water-monitoring.docx',
  'air-monitoring.docx',
  'eia.docx',
  'hazardous-waste-generators.docx',
  'survey.docx',
];

describe('every checked-in template is well-formed XML', () => {
  it.each(CHECKED_IN_TEMPLATES)('%s', file => {
    expect(() => assertWellFormed(docXml(load(file)))).not.toThrow();
  });
});

describe('every checked-in template starts ATTACHMENTS on its own page', () => {
  it.each(CHECKED_IN_TEMPLATES)('%s', file => {
    const xml = docXml(load(file));
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const attachmentsParagraph = paragraphs.find(p => {
      const text = [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join('');
      return text === 'ATTACHMENTS';
    });
    expect(attachmentsParagraph).toBeDefined();
    const pPr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(attachmentsParagraph!);
    expect(pPr).toBeTruthy();
    expect(pPr![0]).toContain('<w:pageBreakBefore/>');
  });
});

describe('water-monitoring.docx renders', () => {
  it('a full report with no tag left behind', () => {
    const out = renderDocx(load('water-monitoring.docx'), mapBundle(fullWaterBundle(), ctx), [
      { id: 'a1', bytes: png1x1, mime: 'image/png', width: 1, height: 1 },
    ]);
    const xml = docXml(out);
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    expect(xml).toContain('Alpha Water Refilling');
    expect(xml).toContain('05 September 2026');
    expect(xml).toContain('Calapan River (Class C)');
    expect(xml).toContain('IMG_0002.jpg (not downloaded)');
    expect(xml).toContain('<w:drawing>');
    expect(xml.split(TICKED).length - 1).toBeGreaterThan(5);
    expect(new PizZip(out).file('word/media/export_1.png')).toBeTruthy();
    expect(() => assertWellFormed(xml)).not.toThrow();
    // The plain case (no additional inspectors) prints the primary
    // inspector's name and position once each, as separate paragraphs.
    expect(submittedByParagraphs(xml, signatories.inspectorName)).toEqual([signatories.inspectorName, signatories.inspectorPosition, '']);
  });

  it('an empty draft, still showing the printed row counts', () => {
    const xml = docXml(renderDocx(load('water-monitoring.docx'), mapBundle(emptyWaterBundle(), ctx), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    // 3 outlet rows + 2 component rows survive padding
    expect(xml).toContain('Receiving Body of Water');
    expect(() => assertWellFormed(xml)).not.toThrow();
  });

  it('stacks additional inspectors under the primary one, with no tag left behind', () => {
    const ctxWithExtras = {
      signatories: {
        ...signatories,
        additionalInspectors: [
          { name: 'Second Inspector', position: 'Engineer I' },
          { name: 'Third Inspector', position: 'Engineer III' },
        ],
      },
    };
    const xml = docXml(renderDocx(load('water-monitoring.docx'), mapBundle(fullWaterBundle(), ctxWithExtras), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    expect(xml).toContain(signatories.inspectorName);
    expect(xml).toContain('Second Inspector');
    expect(xml).toContain('Third Inspector');
    // The primary inspector's name prints exactly once — the loop doesn't
    // duplicate it alongside the top-level sig_inspector_name tag.
    expect(xml.split(signatories.inspectorName).length - 1).toBe(1);
    expect(() => assertWellFormed(xml)).not.toThrow();
    // Whole paragraphs repeat per inspector: name and position are separate
    // paragraphs, each followed by a blank spacer paragraph, for every
    // inspector — never a name glued onto the next inspector's position.
    expect(submittedByParagraphs(xml, signatories.inspectorName)).toEqual([
      signatories.inspectorName, signatories.inspectorPosition, '',
      'Second Inspector', 'Engineer I', '',
      'Third Inspector', 'Engineer III', '',
    ]);
  });
});

describe('the other tagged templates render', () => {
  it('air-monitoring.docx with no tag left behind', () => {
    const bundle = { ...fullWaterBundle(), report: { ...fullWaterBundle().report, reportType: 'air_monitoring' }, compliance: { kind: 'none' as const } };
    const xml = docXml(renderDocx(load('air-monitoring.docx'), mapBundle(bundle, ctx), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    expect(xml).toContain('Alpha Water Refilling');
    expect(() => assertWellFormed(xml)).not.toThrow();
  });

  it('eia.docx with no tag left behind', () => {
    const bundle = { ...fullWaterBundle(), report: { ...fullWaterBundle().report, reportType: 'eia' }, compliance: { kind: 'none' as const } };
    const xml = docXml(renderDocx(load('eia.docx'), mapBundle(bundle, ctx), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    expect(xml).toContain('Alpha Water Refilling');
    expect(() => assertWellFormed(xml)).not.toThrow();
  });

  it('hazardous-waste-generators.docx with no tag left behind', () => {
    const bundle = { ...fullWaterBundle(), report: { ...fullWaterBundle().report, reportType: 'hazardous_waste' }, compliance: { kind: 'none' as const } };
    const xml = docXml(renderDocx(load('hazardous-waste-generators.docx'), mapBundle(bundle, ctx), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    expect(xml).toContain('Alpha Water Refilling');
    expect(() => assertWellFormed(xml)).not.toThrow();
  });

  it('survey.docx with no tag left behind', () => {
    const xml = docXml(renderDocx(load('survey.docx'), mapBundle(fullSurveyBundle(), ctx), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    expect(xml).toContain('Bucayao Bridge');
    expect(() => assertWellFormed(xml)).not.toThrow();
  });
});
