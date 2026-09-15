import type PizZip from 'pizzip';
import type { ImageInput } from '../types';

// Placeholder until Task 4: returns a plain paragraph per image so the
// renderer can be built and tested first.
export function embedImages(_zip: PizZip, images: ImageInput[]): Map<string, string> {
  return new Map(images.map(img => [img.id, `<w:p><w:r><w:t>[image ${img.id}]</w:t></w:r></w:p>`]));
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function textParagraph(s: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(s)}</w:t></w:r></w:p>`;
}
