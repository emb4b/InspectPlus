import { docxFileName, slugify, uniqueFileNames, zipFileName } from './fileNames';

describe('fileNames', () => {
  it('slugifies to file-safe ASCII', () => {
    expect(slugify('Alpha Water Refilling & Ice, Inc.')).toBe('Alpha-Water-Refilling-Ice-Inc');
    expect(slugify('  Ñandú / Café ')).toBe('Nandu-Cafe');
    expect(slugify('')).toBe('report');
  });
  it('names a docx by type, establishment and date', () => {
    expect(docxFileName('Water Monitoring', 'Alpha Water', '2026-09-05')).toBe('Water-Monitoring-Alpha-Water-2026-09-05.docx');
    expect(docxFileName('Water Monitoring', 'Alpha', '')).toBe('Water-Monitoring-Alpha-undated.docx');
  });
  it('names the zip by local time', () => {
    expect(zipFileName(new Date(2026, 8, 5, 14, 7))).toBe('InspectPlus-exports-20260905-1407.zip');
  });
  it('disambiguates duplicates', () => {
    expect(uniqueFileNames(['a.docx', 'b.docx', 'a.docx', 'a.docx'])).toEqual(['a.docx', 'b.docx', 'a (2).docx', 'a (3).docx']);
  });
});
