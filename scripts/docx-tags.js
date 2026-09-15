#!/usr/bin/env node
// Lists every merge tag in a .docx's word/document.xml. Word may split a
// tag across runs ("{gi_" in one <w:t>, "name}" in the next) — docxtemplater
// copes with that at render time, but for listing we join all text first.
//
//   node scripts/docx-tags.js "assets/templates/Water Monitoring.docx"
const fs = require('fs');
const PizZip = require('pizzip');

function listTags(docxPath) {
  const zip = new PizZip(fs.readFileSync(docxPath));
  const xml = zip.file('word/document.xml').asText();
  const text = xml.replace(/<[^>]+>/g, '');
  const tags = new Set();
  const loops = new Set();
  const raw = new Set();
  for (const match of text.matchAll(/\{([#/@]?)([A-Za-z0-9_.]+)\}/g)) {
    const [, kind, name] = match;
    if (kind === '#' || kind === '/') loops.add(name);
    else if (kind === '@') raw.add(name);
    else tags.add(name);
  }
  const sorted = set => [...set].sort();
  return { tags: sorted(tags), loops: sorted(loops), raw: sorted(raw) };
}

module.exports = { listTags };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: docx-tags.js <file.docx>');
    process.exit(1);
  }
  const result = listTags(file);
  console.log(JSON.stringify(result, null, 2));
}
