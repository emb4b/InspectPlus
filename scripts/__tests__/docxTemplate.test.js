const fs = require('fs');
const os = require('os');
const path = require('path');
const PizZip = require('pizzip');
const { unpackDocx, packDocx } = require('../docx-template');
const { listTags } = require('../docx-tags');

const DOC_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t>{gi_name}</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>{#rows}{a}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>{b}{/rows}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:t>{@photo_drawing}</w:t></w:r></w:p>
<w:p><w:r><w:t>{cb_yes}</w:t></w:r></w:p>
</w:body></w:document>`;

function makeDocx(file) {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('word/document.xml', DOC_XML);
  fs.writeFileSync(file, zip.generate({ type: 'nodebuffer' }));
}

describe('docx-template scripts', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('unpacks to a folder and packs back to an equivalent docx', () => {
    const src = path.join(dir, 'a.docx');
    makeDocx(src);
    const out = path.join(dir, 'unpacked');
    unpackDocx(src, out);
    expect(fs.readFileSync(path.join(out, 'word/document.xml'), 'utf8')).toBe(DOC_XML);

    fs.writeFileSync(path.join(out, 'word/document.xml'), DOC_XML.replace('{gi_name}', '{gi_name2}'));
    const dst = path.join(dir, 'b.docx');
    packDocx(out, dst);
    const zip = new PizZip(fs.readFileSync(dst));
    expect(zip.file('word/document.xml').asText()).toContain('{gi_name2}');
    expect(zip.file('[Content_Types].xml').asText()).toBe('<Types/>');
  });

  it('lists plain, loop and raw tags separately, sorted and unique', () => {
    const src = path.join(dir, 'a.docx');
    makeDocx(src);
    expect(listTags(src)).toEqual({
      tags: ['a', 'b', 'cb_yes', 'gi_name'],
      loops: ['rows'],
      raw: ['photo_drawing'],
    });
  });
});
