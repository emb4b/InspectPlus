#!/usr/bin/env node
// Unpack a .docx into a folder (so word/document.xml can be edited by hand
// or by a script) and pack it back. A .docx is a zip; nothing else about it
// is special. Used to insert merge tags into the EMB templates under
// assets/templates — see docs/superpowers/specs/2026-09-15-export-inspection-report-design.md.
//
//   node scripts/docx-template.js unpack "assets/templates/Water Monitoring.docx" tmp/water
//   node scripts/docx-template.js pack tmp/water "assets/templates/Water Monitoring.docx"
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

function unpackDocx(docxPath, outDir) {
  const zip = new PizZip(fs.readFileSync(docxPath));
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const target = path.join(outDir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.asNodeBuffer());
  }
}

function packDocx(dir, docxPath) {
  const zip = new PizZip();
  // [Content_Types].xml first, as Word writes it — some readers expect it.
  const names = walk(dir).sort((a, b) => (a === '[Content_Types].xml' ? -1 : b === '[Content_Types].xml' ? 1 : a.localeCompare(b)));
  for (const name of names) {
    const bytes = fs.readFileSync(path.join(dir, name));
    const isXml = /\.(xml|rels)$/.test(name);
    zip.file(name, bytes, { compression: isXml ? 'DEFLATE' : 'STORE' });
  }
  fs.writeFileSync(docxPath, zip.generate({ type: 'nodebuffer' }));
}

module.exports = { unpackDocx, packDocx };

if (require.main === module) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'unpack' && a && b) unpackDocx(a, b);
  else if (cmd === 'pack' && a && b) packDocx(a, b);
  else {
    console.error('usage: docx-template.js unpack <file.docx> <dir> | pack <dir> <file.docx>');
    process.exit(1);
  }
}
