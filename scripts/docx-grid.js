#!/usr/bin/env node
// Prints the table/row/cell coordinates recipes are written against.
const fs = require('fs');
const PizZip = require('pizzip');
const { normalise, tableGrid } = require('./docx-tag');

const xml = normalise(new PizZip(fs.readFileSync(process.argv[2])).file('word/document.xml').asText());
tableGrid(xml).forEach((t, ti) => {
  console.log(`\nTABLE ${ti + 1} (${t.rows.length} rows)`);
  t.rows.forEach((r, ri) => {
    const cells = r.cells.map((c, ci) => {
      const cellXml = xml.slice(c.start, c.end);
      const boxes = (cellXml.match(/<w:t>☐<\/w:t>/g) || []).length;
      const text = cellXml.replace(/<w:t>☐<\/w:t>/g, '☐').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `${ci + 1}:${text || '∅'}${boxes ? `[cb×${boxes}]` : ''}`;
    });
    console.log(`r${ri + 1}: ${cells.join(' | ')}`);
  });
});
