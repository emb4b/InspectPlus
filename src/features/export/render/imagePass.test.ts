import PizZip from 'pizzip';
import { embedImages, textParagraph, MAX_WIDTH_EMU, MAX_HEIGHT_EMU } from './imagePass';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml" Id="rId2"/></Relationships>`;

function zipWith(): PizZip {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('word/_rels/document.xml.rels', RELS);
  zip.file('word/document.xml', '<w:document/>');
  return zip;
}

describe('embedImages', () => {
  const jpeg = { id: 'a', bytes: new Uint8Array([0xff, 0xd8, 0xff]), mime: 'image/jpeg' as const, width: 4000, height: 3000 };
  const png = { id: 'b', bytes: new Uint8Array([0x89, 0x50]), mime: 'image/png' as const, width: 600, height: 1200 };

  it('adds a media part, a relationship and the jpeg content type', () => {
    const zip = zipWith();
    const drawings = embedImages(zip, [jpeg, png]);
    expect(zip.file('word/media/export_1.jpeg')).toBeTruthy();
    expect(zip.file('word/media/export_2.png')).toBeTruthy();
    const rels = zip.file('word/_rels/document.xml.rels')!.asText();
    expect(rels).toContain('Target="media/export_1.jpeg"');
    expect(rels).toContain('Target="media/export_2.png"');
    expect(rels).toContain('relationships/image');
    const types = zip.file('[Content_Types].xml')!.asText();
    expect(types).toContain('Extension="jpeg"');
    expect(types.match(/Extension="png"/g)).toHaveLength(1);
    expect(drawings.size).toBe(2);
  });

  it('picks relationship ids that do not collide with existing ones', () => {
    const zip = zipWith();
    const drawings = embedImages(zip, [jpeg]);
    const rels = zip.file('word/_rels/document.xml.rels')!.asText();
    const ids = [...rels.matchAll(/Id="(rId\d+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(drawings.get('a')).toContain(`r:embed="${ids.find(i => i !== 'rId2')}"`);
  });

  it('scales a landscape image to the max width and a portrait one to the max height', () => {
    const zip = zipWith();
    const drawings = embedImages(zip, [jpeg, png]);
    const extent = (xml: string) => {
      const m = /<wp:extent cx="(\d+)" cy="(\d+)"\/>/.exec(xml)!;
      return { cx: Number(m[1]), cy: Number(m[2]) };
    };
    const a = extent(drawings.get('a')!);
    expect(a.cx).toBe(MAX_WIDTH_EMU);
    expect(a.cy).toBe(Math.round((MAX_WIDTH_EMU * 3000) / 4000));
    const b = extent(drawings.get('b')!);
    expect(b.cy).toBe(MAX_HEIGHT_EMU);
    expect(b.cx).toBe(Math.round((MAX_HEIGHT_EMU * 600) / 1200));
  });

  it('wraps the drawing in a centred paragraph so the raw tag can replace its paragraph', () => {
    const zip = zipWith();
    const xml = embedImages(zip, [jpeg]).get('a')!;
    expect(xml.startsWith('<w:p><w:pPr><w:jc w:val="center"/></w:pPr>')).toBe(true);
    expect(xml.endsWith('</w:p>')).toBe(true);
    expect(xml).toContain('<w:drawing>');
    expect(xml).toContain('<pic:pic');
  });

  it('falls back to a 4:3 box when the dimensions are unusable', () => {
    const zip = zipWith();
    const xml = embedImages(zip, [{ ...jpeg, width: 0, height: 0 }]).get('a')!;
    expect(xml).toContain(`<wp:extent cx="${MAX_WIDTH_EMU}" cy="${Math.round((MAX_WIDTH_EMU * 3) / 4)}"/>`);
  });
});

describe('textParagraph', () => {
  it('renders plain by default', () => {
    expect(textParagraph('hi')).toBe('<w:p><w:r><w:t xml:space="preserve">hi</w:t></w:r></w:p>');
  });

  it('centres the paragraph when asked', () => {
    expect(textParagraph('hi', 'center')).toBe('<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">hi</w:t></w:r></w:p>');
  });
});
