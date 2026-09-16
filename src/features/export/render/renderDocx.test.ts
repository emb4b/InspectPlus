import PizZip from 'pizzip';
import { renderDocx, RenderError } from './renderDocx';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

function docx(body: string): Uint8Array {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('word/_rels/document.xml.rels', RELS);
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generate({ type: 'uint8array' });
}

const p = (t: string) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const documentXml = (bytes: Uint8Array) => new PizZip(bytes).file('word/document.xml')!.asText();

describe('renderDocx', () => {
  it('fills plain tags and turns newlines into line breaks', () => {
    const out = renderDocx(docx(p('{gi_name}') + p('{remarks}')), { gi_name: 'Alpha', remarks: 'a\nb' }, []);
    const xml = documentXml(out);
    expect(xml).toContain('Alpha');
    expect(xml).toContain('<w:br/>');
    expect(xml).not.toContain('{');
  });

  it('prints an empty string for a tag the data does not mention', () => {
    const xml = documentXml(renderDocx(docx(p('[{missing}]')), {}, []));
    expect(xml).toContain('[]');
  });

  it('repeats a table row per loop item', () => {
    const body = `<w:tbl><w:tr><w:tc>${p('{#rows}{a}')}</w:tc><w:tc>${p('{b}{/rows}')}</w:tc></w:tr></w:tbl>`;
    const xml = documentXml(renderDocx(docx(body), { rows: [{ a: '1', b: '2' }, { a: '3', b: '4' }] }, []));
    expect(xml.match(/<w:tr>/g)).toHaveLength(2);
    expect(xml).toContain('3');
  });

  it('injects photo_drawing for every nested row with a photo_id, from the embedded images or the missing text', () => {
    const body = `<w:tbl><w:tr><w:tc>${p('{#photo_rows}{#left}')}${p('{@photo_drawing}')}${p('{caption}{/left}')}</w:tc><w:tc>${p('{#right}')}${p('{@photo_drawing}')}${p('{caption}{/right}{/photo_rows}')}</w:tc></w:tr></w:tbl>`;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const out = renderDocx(
      docx(body),
      {
        photo_rows: [
          {
            left: [{ photo_id: 'a1', caption: 'Figure 1: front gate', photo_missing_text: '(photo not downloaded)' }],
            right: [{ photo_id: 'a2', caption: 'Figure 2: outfall', photo_missing_text: '(photo not downloaded)' }],
          },
        ],
      },
      [{ id: 'a1', bytes: png, mime: 'image/png', width: 800, height: 600 }],
    );
    const xml = documentXml(out);
    expect(xml).toContain('Figure 1: front gate');
    expect(xml).toContain('Figure 2: outfall');
    expect(xml).toContain('(photo not downloaded)');
    expect(xml.match(/\(photo not downloaded\)/g)).toHaveLength(1);
    expect(xml).not.toContain('{');
  });

  it('escapes XML-significant characters in values', () => {
    const xml = documentXml(renderDocx(docx(p('{v}')), { v: 'A & B <C>' }, []));
    expect(xml).toContain('A &amp; B &lt;C&gt;');
  });

  it('throws a RenderError naming the offending tag on a malformed template', () => {
    expect(() => renderDocx(docx(p('{#open}')), {}, [])).toThrow(RenderError);
    try {
      renderDocx(docx(p('{#open}')), {}, []);
    } catch (e) {
      expect((e as RenderError).tags).toContain('open');
    }
  });
});
