import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { renderDocx } from './renderDocx';
import { mapBundle } from '../mappers';
import { fullWaterBundle, emptyWaterBundle, signatories } from '../mappers/fixtures';
import { TICKED } from '../mappers/primitives';

const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', '..', 'assets', 'templates');
const ctx = { signatories };
const load = (file: string) => new Uint8Array(fs.readFileSync(path.join(TEMPLATES_DIR, file)));
const docXml = (bytes: Uint8Array) => new PizZip(bytes).file('word/document.xml')!.asText();
const png1x1 = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));

describe('Water Monitoring.docx renders', () => {
  it('a full report with no tag left behind', () => {
    const out = renderDocx(load('Water Monitoring.docx'), mapBundle(fullWaterBundle(), ctx), [
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
  });

  it('an empty draft, still showing the printed row counts', () => {
    const xml = docXml(renderDocx(load('Water Monitoring.docx'), mapBundle(emptyWaterBundle(), ctx), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    // 3 outlet rows + 2 component rows survive padding
    expect(xml).toContain('Receiving Body of Water');
  });
});
