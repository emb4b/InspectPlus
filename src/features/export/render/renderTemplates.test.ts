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
  });

  it('an empty draft, still showing the printed row counts', () => {
    const xml = docXml(renderDocx(load('water-monitoring.docx'), mapBundle(emptyWaterBundle(), ctx), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    // 3 outlet rows + 2 component rows survive padding
    expect(xml).toContain('Receiving Body of Water');
    expect(() => assertWellFormed(xml)).not.toThrow();
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
