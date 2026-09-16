import type PizZip from 'pizzip';
import type { ImageInput } from '../types';

// Puts each photo into the package the way Word does — a part under
// word/media, a relationship from document.xml to it, a content type for
// its extension — and hands back the <w:drawing> paragraph the template's
// raw {@photo_drawing} tag prints. Hand-written because docxtemplater's
// image module is paid and the community fork is unmaintained; this is
// the whole surface the app needs.

const EMU_PER_INCH = 914400;
export const MAX_WIDTH_EMU = 3 * EMU_PER_INCH;
export const MAX_HEIGHT_EMU = 3 * EMU_PER_INCH;
const IMAGE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const RELS_PATH = 'word/_rels/document.xml.rels';
const CONTENT_TYPES_PATH = '[Content_Types].xml';

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function textParagraph(s: string, align?: 'center'): string {
  const pPr = align === 'center' ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '';
  return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${escapeXml(s)}</w:t></w:r></w:p>`;
}

function fitExtent(width: number, height: number): { cx: number; cy: number } {
  const usable = width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height);
  const w = usable ? width : 4;
  const h = usable ? height : 3;
  const scale = Math.min(MAX_WIDTH_EMU / w, MAX_HEIGHT_EMU / h);
  return { cx: Math.round(w * scale), cy: Math.round(h * scale) };
}

function nextRelId(rels: string): string {
  const used = new Set([...rels.matchAll(/Id="rId(\d+)"/g)].map(m => Number(m[1])));
  let n = 1;
  while (used.has(n)) n += 1;
  return `rId${n}`;
}

function ensureContentType(zip: PizZip, ext: string, mime: string): void {
  const file = zip.file(CONTENT_TYPES_PATH);
  if (!file) return;
  const xml = file.asText();
  if (new RegExp(`Extension="${ext}"`, 'i').test(xml)) return;
  zip.file(CONTENT_TYPES_PATH, xml.replace('</Types>', `<Default Extension="${ext}" ContentType="${mime}"/></Types>`));
}

function drawingParagraph(relId: string, index: number, name: string, cx: number, cy: number): string {
  return (
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    `<wp:docPr id="${1000 + index}" name="${escapeXml(name)}"/>` +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:nvPicPr><pic:cNvPr id="${index}" name="${escapeXml(name)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
  );
}

export function embedImages(zip: PizZip, images: ImageInput[]): Map<string, string> {
  const drawings = new Map<string, string>();
  if (images.length === 0) return drawings;

  const relsFile = zip.file(RELS_PATH);
  let rels = relsFile ? relsFile.asText() : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';

  images.forEach((img, i) => {
    const index = i + 1;
    const ext = img.mime === 'image/png' ? 'png' : 'jpeg';
    const target = `media/export_${index}.${ext}`;
    zip.file(`word/${target}`, img.bytes, { compression: 'STORE' });
    ensureContentType(zip, ext, img.mime);

    const relId = nextRelId(rels);
    rels = rels.replace('</Relationships>', `<Relationship Type="${IMAGE_REL_TYPE}" Target="${target}" Id="${relId}"/></Relationships>`);

    const { cx, cy } = fitExtent(img.width, img.height);
    drawings.set(img.id, drawingParagraph(relId, index, `export_${index}`, cx, cy));
  });

  zip.file(RELS_PATH, rels);
  return drawings;
}
