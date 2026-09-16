#!/usr/bin/env node
// Inserts merge tags into an EMB .docx from a JSON recipe. See
// docs/superpowers/plans/2026-09-15-export-inspection-report.md (Task 11)
// for the recipe format and assets/templates/recipes/ for the real ones.
//
//   node scripts/docx-tag.js all
//   node scripts/docx-tag.js originals/X.docx recipes/x.json X.docx
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const TEMPLATES_DIR = path.join(__dirname, '..', 'assets', 'templates');

// ── XML helpers (string-based; the forms have no nested tables) ──────────────

function unescapeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Every element of `tag` as {start, end} spans, non-nested (tables/rows/cells here never nest).
function spans(xml, tag, from = 0, to = xml.length) {
  const out = [];
  const open = new RegExp(`<${tag}(?=[\\s>/])`, 'g');
  open.lastIndex = from;
  let m;
  while ((m = open.exec(xml)) && m.index < to) {
    const selfClose = xml.indexOf('>', m.index);
    if (xml[selfClose - 1] === '/') { out.push({ start: m.index, end: selfClose + 1 }); continue; }
    const close = xml.indexOf(`</${tag}>`, m.index);
    if (close < 0) throw new Error(`unclosed <${tag}> at ${m.index}`);
    out.push({ start: m.index, end: close + tag.length + 3 });
    open.lastIndex = close;
  }
  return out;
}

function normalise(xml) {
  // Unwrap checkbox content controls: keep what's inside <w:sdtContent>.
  // The content itself must stop at the control's OWN closing
  // </w:sdtContent> — a lazy [\s\S]*? followed directly by </w:sdt> runs
  // into the NEXT control whenever a <w:sdtEndPr>…</w:sdtEndPr> sits between
  // </w:sdtContent> and </w:sdt> (Word writes this for cell-level checkbox
  // controls), producing an unbalanced document.xml.
  let out = xml.replace(
    /<w:sdt>(?:(?!<w:sdt>)[\s\S])*?<w14:checkbox>[\s\S]*?<\/w:sdtPr><w:sdtContent>((?:(?!<\/w:sdtContent>)[\s\S])*)<\/w:sdtContent>(?:<w:sdtEndPr>[\s\S]*?<\/w:sdtEndPr>)?<\/w:sdt>/g,
    '$1',
  );
  // Remove legacy FORMCHECKBOX fields (begin … end runs, plus bookmarks around them).
  out = out.replace(/<w:r>(?:(?!<\/w:r>)[\s\S])*?<w:fldChar w:fldCharType="begin">(?:(?!<w:fldChar w:fldCharType="end")[\s\S])*?FORMCHECKBOX[\s\S]*?<w:fldChar w:fldCharType="end"\s*\/><\/w:r>/g, '');
  // Only strip the bookmarks that wrap the checkbox fields — other bookmarks (e.g. Word's
  // own `_GoBack`) share the same <w:bookmarkEnd w:id="N"/> shape and must survive intact.
  const checkIds = [...out.matchAll(/<w:bookmarkStart w:name="Check\d+" w:id="(\d+)"\s*\/>/g)].map(m => m[1]);
  out = out.replace(/<w:bookmarkStart w:name="Check\d+" w:id="\d+"\s*\/>/g, '');
  if (checkIds.length) {
    const endRe = new RegExp(`<w:bookmarkEnd w:id="(?:${checkIds.join('|')})"\\s*/>`, 'g');
    out = out.replace(endRe, '');
  }
  // A wholly-empty paragraph (no run, no content) is written by Word as a
  // self-closing <w:p .../>. cell/loop/cloneRowAfter locate a paragraph's end
  // by subtracting the length of the literal "</w:p>" from its span end —
  // which only holds for the open/close form. Expand every self-closing
  // <w:p/> up front so that assumption is always true.
  out = out.replace(/<w:p((?:\s+[^<>]*)?)\/>/g, '<w:p$1></w:p>');
  return out;
}

function tableGrid(xml) {
  return spans(xml, 'w:tbl').map(t => ({
    ...t,
    rows: spans(xml, 'w:tr', t.start, t.end).map(r => ({ ...r, cells: spans(xml, 'w:tc', r.start, r.end) })),
  }));
}

function locate(grid, table, row, cell) {
  const t = grid[table - 1];
  if (!t) throw new Error(`no table ${table} (document has ${grid.length})`);
  if (row == null) return { t };
  const r = t.rows[row - 1];
  if (!r) throw new Error(`no row ${row} in table ${table} (has ${t.rows.length})`);
  if (cell == null) return { t, r };
  const c = r.cells[cell - 1];
  if (!c) throw new Error(`no cell ${cell} in table ${table} row ${row} (has ${r.cells.length})`);
  return { t, r, c };
}

function lastParagraph(xml, span) {
  const ps = spans(xml, 'w:p', span.start, span.end);
  if (!ps.length) throw new Error(`no paragraph in cell at ${span.start}`);
  return ps[ps.length - 1];
}
function firstParagraph(xml, span) {
  const ps = spans(xml, 'w:p', span.start, span.end);
  if (!ps.length) throw new Error(`no paragraph in cell at ${span.start}`);
  return ps[0];
}

// rPr to give an inserted run: the paragraph's last run's, else the paragraph mark's.
function runPropsFor(xml, p) {
  const runs = spans(xml, 'w:r', p.start, p.end);
  const source = runs.length ? xml.slice(runs[runs.length - 1].start, runs[runs.length - 1].end) : xml.slice(p.start, p.end);
  const m = /<w:rPr>[\s\S]*?<\/w:rPr>/.exec(source);
  return m ? m[0] : '';
}
const run = (rpr, textXml) => `<w:r>${rpr}<w:t xml:space="preserve">${escapeXml(textXml)}</w:t></w:r>`;

// Text runs as {start, end, text} for replaceText / insertAfterParagraph.
function textRuns(xml) {
  const out = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml))) out.push({ start: m.index, end: m.index + m[0].length, text: unescapeXml(m[1]) });
  return out;
}
function paragraphText(xml, p) {
  return textRuns(xml.slice(p.start, p.end)).map(r => r.text).join('');
}

function applyRecipe(originalXml, recipe) {
  const xml = normalise(originalXml);
  const grid = tableGrid(xml);
  const edits = []; // {at, end, text} — replace xml[at, end) with text

  for (const op of recipe.ops ?? []) {
    switch (op.op) {
      case 'cell': {
        const { c } = locate(grid, op.table, op.row, op.cell);
        const p = lastParagraph(xml, c);
        edits.push({ at: p.end - '</w:p>'.length, end: p.end - '</w:p>'.length, text: run(runPropsFor(xml, p), `{${op.tag}}`) });
        break;
      }
      case 'loop': {
        const { r: from } = locate(grid, op.table, op.fromRow);
        const { r: to } = locate(grid, op.table, op.toRow);
        const pFirst = firstParagraph(xml, from.cells[0]);
        const pLast = lastParagraph(xml, to.cells[to.cells.length - 1]);
        const openAt = xml.indexOf('</w:pPr>', pFirst.start);
        const insertAt = openAt > 0 && openAt < pFirst.end ? openAt + '</w:pPr>'.length : xml.indexOf('>', pFirst.start) + 1;
        // Priority breaks ties when another edit lands at the exact same offset (e.g. a
        // 'cell' tag in the same, otherwise-empty paragraph as the loop boundary): the
        // open tag must end up leftmost, the close tag rightmost, of whatever shares its spot.
        edits.push({ at: insertAt, end: insertAt, text: run(runPropsFor(xml, pFirst), `{#${op.name}}`), priority: -1 });
        edits.push({ at: pLast.end - '</w:p>'.length, end: pLast.end - '</w:p>'.length, text: run(runPropsFor(xml, pLast), `{/${op.name}}`), priority: 1 });
        break;
      }
      case 'deleteRows': {
        for (const rowNo of op.rows) {
          const { r } = locate(grid, op.table, rowNo);
          edits.push({ at: r.start, end: r.end, text: '' });
        }
        break;
      }
      case 'cloneRowAfter': {
        const { r } = locate(grid, op.table, op.row);
        let clone = xml.slice(r.start, r.end);
        const cells = spans(clone, 'w:tc');
        for (let i = cells.length - 1; i >= 0; i -= 1) {
          const cellXml = clone.slice(cells[i].start, cells[i].end);
          const ps = spans(cellXml, 'w:p');
          const first = ps[0];
          const rpr = runPropsFor(cellXml, first);
          const pOpen = cellXml.slice(first.start, cellXml.indexOf('>', first.start) + 1);
          const pPr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(cellXml.slice(first.start, first.end));
          const text = op.cells[i] != null ? run(rpr, op.cells[i]) : '';
          const newCell = cellXml.slice(0, first.start) + pOpen + (pPr ? pPr[0] : '') + text + '</w:p>' + '</w:tc>';
          clone = clone.slice(0, cells[i].start) + newCell + clone.slice(cells[i].end);
        }
        edits.push({ at: r.end, end: r.end, text: clone });
        break;
      }
      case 'replaceText': {
        const matches = textRuns(xml).filter(t => t.text === op.find);
        const target = matches[(op.nth ?? 1) - 1];
        if (!target) throw new Error(`replaceText: text "${op.find}" occurrence ${op.nth ?? 1} not found (${matches.length} found)`);
        edits.push({ at: target.start, end: target.end, text: `<w:t xml:space="preserve">${escapeXml(op.with)}</w:t>` });
        break;
      }
      case 'pageBreakBefore': {
        const ps = spans(xml, 'w:p');
        const p = ps.find(s => paragraphText(xml, s) === op.find);
        if (!p) throw new Error(`pageBreakBefore: no paragraph reads exactly "${op.find}"`);
        const pPrMatch = /<w:pPr(?:\s[^>]*)?>/.exec(xml.slice(p.start, p.end));
        if (pPrMatch) {
          const at = p.start + pPrMatch.index + pPrMatch[0].length;
          edits.push({ at, end: at, text: '<w:pageBreakBefore/>' });
        } else {
          const openEnd = xml.indexOf('>', p.start) + 1;
          edits.push({ at: openEnd, end: openEnd, text: '<w:pPr><w:pageBreakBefore/></w:pPr>' });
        }
        break;
      }
      case 'insertBeforeParagraph': {
        const ps = spans(xml, 'w:p');
        const p = ps.find(s => paragraphText(xml, s) === op.find);
        if (!p) throw new Error(`insertBeforeParagraph: no paragraph reads exactly "${op.find}"`);
        edits.push({ at: p.start, end: p.start, text: op.xml });
        break;
      }
      case 'insertAfterParagraph': {
        // find: "" is special-cased to mean "the last <w:p> in the body,
        // before <w:sectPr>" — for a form whose final paragraph is wholly
        // empty (no <w:t> at all), so there's no literal text to match on,
        // and picking the first empty paragraph anywhere in the body would
        // be wrong (most forms have several).
        const ps = spans(xml, 'w:p');
        const p = op.find === '' ? ps[ps.length - 1] : ps.find(s => paragraphText(xml, s) === op.find);
        if (!p) throw new Error(`insertAfterParagraph: no paragraph reads exactly "${op.find}"`);
        edits.push({ at: p.end, end: p.end, text: op.xml });
        break;
      }
      default:
        throw new Error(`unknown op ${op.op}`);
    }
  }

  // Apply from the end so earlier offsets stay valid. When two edits insert at the exact
  // same offset, whichever is applied FIRST ends up rendered furthest RIGHT in the final
  // text (each later insertion at that offset lands in front of what's already there) —
  // so equal (at, end) ties sort by descending priority: the higher-priority edit is
  // applied first and lands rightmost (see the 'loop' case above for why this matters).
  edits.sort((a, b) => b.at - a.at || b.end - a.end || (b.priority ?? 0) - (a.priority ?? 0));
  let out = xml;
  for (const e of edits) out = out.slice(0, e.at) + e.text + out.slice(e.end);

  const names = recipe.checkboxes ?? [];
  const glyphs = out.match(/<w:t>☐<\/w:t>/g) ?? [];
  if (glyphs.length !== names.length) {
    throw new Error(`recipe lists ${names.length} names but the document has ${glyphs.length} checkbox glyphs after edits`);
  }
  let i = 0;
  out = out.replace(/<w:t>☐<\/w:t>/g, () => `<w:t>{${names[i++]}}</w:t>`);

  // A leftover content control after the glyph pass means the checkbox
  // unwrap above missed one (e.g. a new sdtEndPr/nesting shape it doesn't
  // handle) — always a bug for these forms, which are never meant to ship
  // with any control still in place.
  if (/<w:sdt[\s>]|<w14:checkbox>/.test(out)) {
    throw new Error('leftover <w:sdt> content control after tagging — the checkbox-unwrap regex missed one');
  }

  assertWellFormed(out);
  return out;
}

// A minimal stack-based well-formedness check: confirms every open tag has a
// matching close tag, in order. Not a full XML validator — just enough to
// catch a generator bug that leaves document.xml unbalanced (see the
// checkbox-unwrap fix above, which one such bug produced). The tag-name
// regex only matches "<" immediately followed by an optional "/" and a name
// character, so the "<?xml …?>" prolog (whose first char is "?") is never
// matched and needs no special-casing; attribute values are consumed as
// opaque quoted strings so a stray "<" or ">" inside one can't desync it.
function assertWellFormed(xml) {
  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)(?:"[^"]*"|'[^']*'|[^'"<>])*?(\/?)>/g;
  const stack = [];
  let m;
  while ((m = tagRe.exec(xml))) {
    const [, closing, name, selfClosing] = m;
    if (closing) {
      const top = stack.pop();
      if (top !== name) {
        throw new Error(`mismatched tag </${name}> at offset ${m.index} (expected ${top ? `</${top}>` : 'no open tag'})`);
      }
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  if (stack.length) {
    throw new Error(`unclosed tag(s) at end of document: ${stack.join(', ')}`);
  }
}

function tagFile(originalPath, recipePath, outPath) {
  const zip = new PizZip(fs.readFileSync(originalPath));
  const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
  zip.file('word/document.xml', applyRecipe(zip.file('word/document.xml').asText(), recipe));
  fs.writeFileSync(outPath, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function tagAll() {
  const recipesDir = path.join(TEMPLATES_DIR, 'recipes');
  for (const file of fs.readdirSync(recipesDir).filter(f => f.endsWith('.json'))) {
    const recipe = JSON.parse(fs.readFileSync(path.join(recipesDir, file), 'utf8'));
    const original = path.join(TEMPLATES_DIR, 'originals', recipe.original);
    const out = path.join(TEMPLATES_DIR, recipe.output);
    tagFile(original, path.join(recipesDir, file), out);
    console.log(`${file} → ${recipe.output}`);
  }
}

module.exports = { applyRecipe, tagFile, normalise, tableGrid, assertWellFormed };

if (require.main === module) {
  const [a, b, c] = process.argv.slice(2);
  if (a === 'all') tagAll();
  else if (a && b && c) tagFile(a, b, c);
  else { console.error('usage: docx-tag.js all | <original.docx> <recipe.json> <out.docx>'); process.exit(1); }
}
