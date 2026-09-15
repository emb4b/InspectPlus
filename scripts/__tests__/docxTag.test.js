const { applyRecipe } = require('../docx-tag');

const P = (t, rpr = '') => `<w:p><w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:pPr>${t === null ? '' : `<w:r>${rpr}<w:t xml:space="preserve">${t}</w:t></w:r>`}</w:p>`;
const TC = (...ps) => `<w:tc><w:tcPr/>${ps.join('')}</w:tc>`;
const TR = (...tcs) => `<w:tr>${tcs.join('')}</w:tr>`;
const SDT = inner => `<w:sdt><w:sdtPr><w14:checkbox><w14:checked w14:val="0"/></w14:checkbox></w:sdtPr><w:sdtContent>${inner}</w:sdtContent></w:sdt>`;
const CB = '<w:r><w:rPr><w:rFonts w:ascii="MS Gothic"/></w:rPr><w:t>☐</w:t></w:r>';

const doc = body => `<w:document><w:body>${body}<w:sectPr/></w:body></w:document>`;

describe('applyRecipe', () => {
  it('appends a tag run to a cell, copying the last run properties', () => {
    const xml = doc(`<w:tbl>${TR(TC(P('Name:')), TC(P('x', '<w:rPr><w:b/></w:rPr>')))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'cell', table: 1, row: 1, cell: 2, tag: 'gi_name' }] });
    expect(out).toContain('<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{gi_name}</w:t></w:r></w:p></w:tc></w:tr>');
  });

  it('uses the paragraph-mark rPr when the paragraph has no runs', () => {
    const xml = doc(`<w:tbl>${TR(TC(P(null)))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'cell', table: 1, row: 1, cell: 1, tag: 't' }] });
    expect(out).toContain('<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">{t}</w:t></w:r>');
  });

  it('replaces the nth exact text', () => {
    const xml = doc(P(' __') + P(' __') + P('Date: ____'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'replaceText', find: ' __', with: ' {b}', nth: 2 }] });
    expect(out.match(/\{b\}/g)).toHaveLength(1);
    expect(out.indexOf('{b}')).toBeGreaterThan(out.indexOf(' __'));
    expect(out).toContain('Date: ____');
  });

  it('wraps rows in a loop and deletes rows, resolving coordinates against the original', () => {
    const xml = doc(`<w:tbl>${TR(TC(P('h')))}${TR(TC(P(null)), TC(P(null)))}${TR(TC(P('gone')))}${TR(TC(P('keep')))}</w:tbl>`);
    const out = applyRecipe(xml, {
      checkboxes: [],
      ops: [
        { op: 'deleteRows', table: 1, rows: [3] },
        { op: 'loop', table: 1, fromRow: 2, toRow: 2, name: 'rows' },
        { op: 'cell', table: 1, row: 2, cell: 1, tag: 'a' },
        { op: 'cell', table: 1, row: 2, cell: 2, tag: 'b' },
        { op: 'cell', table: 1, row: 4, cell: 1, tag: 'k' },
      ],
    });
    expect(out).not.toContain('gone');
    expect(out).toContain('{#rows}');
    expect(out.indexOf('{#rows}')).toBeLessThan(out.indexOf('{a}'));
    expect(out.indexOf('{b}')).toBeLessThan(out.indexOf('{/rows}'));
    expect(out).toContain('keep');
    expect(out.indexOf('keep')).toBeLessThan(out.indexOf('{k}'));
    expect(out.match(/<w:tr>/g)).toHaveLength(3);
  });

  it('clones a row after another with the given cell texts', () => {
    const xml = doc(`<w:tbl>${TR(TC(P('a')), TC(P('b')), TC(P('c')))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'cloneRowAfter', table: 1, row: 1, cells: ['{#x}{p}', '{q}{/x}'] }] });
    expect(out.match(/<w:tr>/g)).toHaveLength(2);
    const second = out.slice(out.lastIndexOf('<w:tr>'));
    expect(second).toContain('{#x}{p}');
    expect(second).toContain('{q}{/x}');
    expect(second).not.toContain('>a<');
    expect(second.match(/<w:tc>/g)).toHaveLength(3);
  });

  it('inserts XML after a paragraph with exact text', () => {
    const xml = doc(P('ATTACHMENTS'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'insertAfterParagraph', find: 'ATTACHMENTS', xml: '<w:tbl>T</w:tbl>' }] });
    expect(out).toContain('ATTACHMENTS</w:t></w:r></w:p><w:tbl>T</w:tbl>');
  });

  it('unwraps checkbox content controls and names the glyphs in order, after deletions', () => {
    const xml = doc(`<w:tbl>${TR(SDT(TC(P(null).replace('</w:p>', CB + '</w:p>'))))}${TR(TC(`<w:p>${SDT(CB)}${SDT(CB)}</w:p>`))}${TR(TC(`<w:p>${SDT(CB)}</w:p>`))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: ['one', 'two', 'three'], ops: [{ op: 'deleteRows', table: 1, rows: [3] }] });
    expect(out).not.toContain('<w:sdt>');
    expect(out).toContain('<w:t>{one}</w:t>');
    expect(out).toContain('<w:t>{two}</w:t><');
    expect(out).toContain('{three}');
    expect(out).not.toContain('☐');
  });

  it('removes legacy FORMCHECKBOX fields', () => {
    const field = '<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:checkBox/></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMCHECKBOX </w:instrText></w:r><w:r></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
    const xml = doc(`<w:p>${field}<w:r><w:t>__</w:t></w:r></w:p>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [] });
    expect(out).not.toContain('FORMCHECKBOX');
    expect(out).not.toContain('fldChar');
    expect(out).toContain('<w:t>__</w:t>');
  });

  it('fails loudly on a checkbox count mismatch or a missing target', () => {
    const xml = doc(`<w:tbl>${TR(TC(`<w:p>${SDT(CB)}</w:p>`))}</w:tbl>`);
    expect(() => applyRecipe(xml, { checkboxes: ['a', 'b'], ops: [] })).toThrow(/2 names .* 1 checkbox/);
    expect(() => applyRecipe(xml, { checkboxes: ['a'], ops: [{ op: 'cell', table: 2, row: 1, cell: 1, tag: 'x' }] })).toThrow(/table 2/);
    expect(() => applyRecipe(xml, { checkboxes: ['a'], ops: [{ op: 'replaceText', find: 'nope', with: 'x', nth: 1 }] })).toThrow(/nope/);
  });
});
