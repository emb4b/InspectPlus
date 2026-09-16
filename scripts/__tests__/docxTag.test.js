const { applyRecipe, assertWellFormed } = require('../docx-tag');

const P = (t, rpr = '') => `<w:p><w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:pPr>${t === null ? '' : `<w:r>${rpr}<w:t xml:space="preserve">${t}</w:t></w:r>`}</w:p>`;
const TC = (...ps) => `<w:tc><w:tcPr/>${ps.join('')}</w:tc>`;
const TR = (...tcs) => `<w:tr>${tcs.join('')}</w:tr>`;
const SDT = inner => `<w:sdt><w:sdtPr><w14:checkbox><w14:checked w14:val="0"/></w14:checkbox></w:sdtPr><w:sdtContent>${inner}</w:sdtContent></w:sdt>`;
// Word writes a <w:sdtEndPr>…</w:sdtEndPr> between </w:sdtContent> and
// </w:sdt> for the EIA form's cell-level checkbox controls (17 of them,
// adjacent within the same cells) — the shape the original lazy unwrap
// regex ran into the NEXT control on.
const SDT_ENDPR = inner =>
  `<w:sdt><w:sdtPr><w14:checkbox><w14:checked w14:val="0"/></w14:checkbox></w:sdtPr><w:sdtContent>${inner}</w:sdtContent><w:sdtEndPr><w:rPr><w:rFonts w:ascii="MS Gothic" w:hAnsi="MS Gothic"/></w:rPr></w:sdtEndPr></w:sdt>`;
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

  it('normalises a self-closing <w:p/> before inserting a cell tag, without corrupting its attributes', () => {
    // Word writes a wholly-empty paragraph as a self-closing <w:p .../>. The
    // cell/loop ops locate a paragraph's end by subtracting '</w:p>'.length
    // from its span end, which only holds for the open/close form — on a
    // self-closing paragraph that used to land mid-attribute and corrupt the
    // XML (see normalise()'s self-closing-<w:p/> expansion).
    const selfClosingP = '<w:p w:rsidR="00AB12CD" w14:textId="77777777" />';
    const xml = doc(`<w:tbl>${TR(TC(selfClosingP))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'cell', table: 1, row: 1, cell: 1, tag: 'x' }] });
    expect(out).toContain('w:rsidR="00AB12CD" w14:textId="77777777"');
    expect(out).toContain('<w:t xml:space="preserve">{x}</w:t>');
    expect(out).toMatch(/<w:p w:rsidR="00AB12CD" w14:textId="77777777" ?><w:r><w:t xml:space="preserve">\{x\}<\/w:t><\/w:r><\/w:p>/);
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

  it('inserts XML before a paragraph with exact text', () => {
    const xml = doc(P('ATTACHMENTS'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'insertBeforeParagraph', find: 'ATTACHMENTS', xml: '<w:tbl>T</w:tbl>' }] });
    expect(out).toContain('<w:tbl>T</w:tbl><w:p>');
    expect(out.indexOf('<w:tbl>T</w:tbl>')).toBeLessThan(out.indexOf('ATTACHMENTS'));
  });

  it('throws when no paragraph reads exactly the insertBeforeParagraph target text', () => {
    const xml = doc(P('ATTACHMENTS'));
    expect(() => applyRecipe(xml, { checkboxes: [], ops: [{ op: 'insertBeforeParagraph', find: 'NOPE', xml: '<w:tbl>T</w:tbl>' }] })).toThrow(/no paragraph reads exactly "NOPE"/);
  });

  it('deletes both empty paragraphs immediately before the target when count is 2', () => {
    const xml = doc(P('before') + P(null) + P(null) + P('NAME OF INSPECTOR'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'deleteEmptyParagraphsBefore', find: 'NAME OF INSPECTOR', count: 2 }] });
    expect(out).toContain('before');
    expect(out).toContain('NAME OF INSPECTOR');
    expect(out.match(/<w:p>/g)).toHaveLength(2);
  });

  it('deletes only the 1 empty paragraph present when count asks for more than exist', () => {
    const xml = doc(P('before') + P(null) + P('NAME OF INSPECTOR'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'deleteEmptyParagraphsBefore', find: 'NAME OF INSPECTOR', count: 2 }] });
    expect(out).toContain('before');
    expect(out).toContain('NAME OF INSPECTOR');
    expect(out.match(/<w:p>/g)).toHaveLength(2);
  });

  it('does not touch a non-empty paragraph, stopping the walk there', () => {
    const xml = doc(P('keep') + P(null) + P('NAME OF INSPECTOR'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'deleteEmptyParagraphsBefore', find: 'NAME OF INSPECTOR', count: 5 }] });
    expect(out).toContain('keep');
    expect(out.match(/<w:p>/g)).toHaveLength(2);
  });

  it('throws when no paragraph reads exactly the deleteEmptyParagraphsBefore target text', () => {
    const xml = doc(P('NAME OF INSPECTOR'));
    expect(() => applyRecipe(xml, { checkboxes: [], ops: [{ op: 'deleteEmptyParagraphsBefore', find: 'NOPE', count: 2 }] })).toThrow(/no paragraph reads exactly "NOPE"/);
  });

  it('sets pageBreakBefore on an existing pPr, ahead of its other children', () => {
    const xml = doc(P('ATTACHMENTS'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'pageBreakBefore', find: 'ATTACHMENTS' }] });
    expect(out).toContain('<w:pPr><w:pageBreakBefore/><w:rPr><w:sz w:val="20"/></w:rPr></w:pPr>');
  });

  it('wraps a fresh pPr with pageBreakBefore when the paragraph has none', () => {
    const xml = doc('<w:p><w:r><w:t>ATTACHMENTS</w:t></w:r></w:p>');
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'pageBreakBefore', find: 'ATTACHMENTS' }] });
    expect(out).toContain('<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>ATTACHMENTS</w:t></w:r></w:p>');
  });

  it('throws when no paragraph reads exactly the pageBreakBefore target text', () => {
    const xml = doc(P('ATTACHMENTS'));
    expect(() => applyRecipe(xml, { checkboxes: [], ops: [{ op: 'pageBreakBefore', find: 'NOPE' }] })).toThrow(/no paragraph reads exactly "NOPE"/);
  });

  it('find: "" targets the last paragraph in the body, not the first empty one', () => {
    // Some forms (e.g. Survey) have no ATTACHMENTS heading at all, and their
    // final paragraph before <w:sectPr> is wholly empty — there's no literal
    // text to match on, and the body has other empty paragraphs earlier too.
    const xml = doc(`${P(null)}${P('middle')}${P(null)}`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'insertAfterParagraph', find: '', xml: '<w:tbl>LAST</w:tbl>' }] });
    expect(out).toContain('<w:tbl>LAST</w:tbl>');
    expect(out.indexOf('middle')).toBeLessThan(out.indexOf('<w:tbl>LAST</w:tbl>'));
    expect(out.lastIndexOf('</w:p>') + '</w:p>'.length).toBe(out.indexOf('<w:tbl>LAST</w:tbl>'));
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

  it('only strips bookmarks paired with a Check* field, leaving unrelated bookmarks like _GoBack intact', () => {
    const field = '<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:checkBox/></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMCHECKBOX </w:instrText></w:r><w:r></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
    const xml = doc(`<w:p><w:bookmarkStart w:name="Check1" w:id="1"/>${field}<w:bookmarkEnd w:id="1"/><w:bookmarkStart w:name="_GoBack" w:id="7"/><w:bookmarkEnd w:id="7"/></w:p>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [] });
    expect(out).not.toContain('Check1');
    expect(out).not.toContain('FORMCHECKBOX');
    expect(out).toContain('<w:bookmarkStart w:name="_GoBack" w:id="7"/>');
    expect(out).toContain('<w:bookmarkEnd w:id="7"/>');
  });

  it('fails loudly on a checkbox count mismatch or a missing target', () => {
    const xml = doc(`<w:tbl>${TR(TC(`<w:p>${SDT(CB)}</w:p>`))}</w:tbl>`);
    expect(() => applyRecipe(xml, { checkboxes: ['a', 'b'], ops: [] })).toThrow(/2 names .* 1 checkbox/);
    expect(() => applyRecipe(xml, { checkboxes: ['a'], ops: [{ op: 'cell', table: 2, row: 1, cell: 1, tag: 'x' }] })).toThrow(/table 2/);
    expect(() => applyRecipe(xml, { checkboxes: ['a'], ops: [{ op: 'replaceText', find: 'nope', with: 'x', nth: 1 }] })).toThrow(/nope/);
  });

  it('unwraps adjacent checkbox controls that carry an sdtEndPr, without one swallowing the next', () => {
    // Regression for the EIA template: a lazy </w:sdtContent></w:sdt> match
    // with no sdtEndPr allowance runs past the first control's own close and
    // consumes the second control's checkbox glyph along with everything
    // between them, corrupting the document and losing a checkbox.
    const xml = doc(`<w:tbl>${TR(TC(`<w:p>${SDT_ENDPR(CB)}${SDT_ENDPR(CB)}</w:p>`))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: ['one', 'two'], ops: [] });
    expect(out).not.toContain('<w:sdt>');
    expect(out).not.toContain('<w:sdtEndPr>');
    expect(out).not.toContain('☐');
    expect(out).toContain('<w:t>{one}</w:t>');
    expect(out).toContain('<w:t>{two}</w:t>');
    assertWellFormed(out);
  });

  it('guards against a leftover content control after tagging', () => {
    // A content control the checkbox unwrap doesn't recognize (no
    // <w14:checkbox> in its sdtPr) survives normalise() untouched — always a
    // bug for these forms, which must never ship with a control in place.
    const nonCheckboxSdt = '<w:sdt><w:sdtPr><w:alias w:val="x"/></w:sdtPr><w:sdtContent><w:r><w:t>x</w:t></w:r></w:sdtContent></w:sdt>';
    const xml = doc(`<w:p>${nonCheckboxSdt}</w:p>`);
    expect(() => applyRecipe(xml, { checkboxes: [], ops: [] })).toThrow(/leftover/);
  });
});

describe('assertWellFormed', () => {
  it('accepts well-formed xml with a prolog, attributes, and self-closing tags', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:document><w:body><w:p w:rsidR="00AB12CD" w14:textId="77777777"/>' +
      '<w:r><w:t xml:space="preserve">hi &gt; there</w:t></w:r></w:body></w:document>';
    expect(() => assertWellFormed(xml)).not.toThrow();
  });

  it('throws on an unbalanced fragment', () => {
    const xml = '<w:document><w:body><w:p></w:body></w:document>';
    expect(() => assertWellFormed(xml)).toThrow(/mismatched tag/);
  });
});
