#!/usr/bin/env node
// Lists every <w:t> text with its occurrence index, for replaceText ops.
//   node scripts/docx-runs.js file.docx [substring]
const fs = require('fs');
const PizZip = require('pizzip');
const { normalise } = require('./docx-tag');

const [file, needle] = process.argv.slice(2);
const xml = normalise(new PizZip(fs.readFileSync(file)).file('word/document.xml').asText());
const seen = new Map();
for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
  const text = m[1];
  const n = (seen.get(text) ?? 0) + 1;
  seen.set(text, n);
  if (!needle || text.includes(needle)) console.log(`${JSON.stringify(text)} nth=${n}`);
}
