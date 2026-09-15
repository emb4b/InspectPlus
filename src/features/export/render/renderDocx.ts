import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { ImageInput, TemplateData } from '../types';
import { embedImages, textParagraph } from './imagePass';

// The one place the app touches docxtemplater. Knows nothing about report
// types: bytes in, bytes out. The single convention it does carry is the
// photo rows — any loop row with a `photo_id` gets its `photo_drawing`
// raw-XML value filled here, because only the renderer knows the
// relationship ids the images were embedded under.
export class RenderError extends Error {
  tags: string[];
  constructor(message: string, tags: string[]) {
    super(message);
    this.name = 'RenderError';
    this.tags = tags;
  }
}

interface DocxtemplaterErrorLike {
  properties?: { errors?: { properties?: { id?: string; xtag?: string; explanation?: string } }[]; xtag?: string; explanation?: string };
  message?: string;
}

function toRenderError(error: unknown): RenderError {
  const e = error as DocxtemplaterErrorLike;
  const inner = e.properties?.errors ?? [];
  const tags = inner.map(x => x.properties?.xtag).filter((t): t is string => !!t);
  if (e.properties?.xtag) tags.push(e.properties.xtag);
  const explanation = inner[0]?.properties?.explanation ?? e.properties?.explanation ?? e.message ?? 'render failed';
  return new RenderError(tags.length ? `${explanation} (tag: ${tags.join(', ')})` : explanation, tags);
}

function withPhotoDrawings(data: TemplateData, drawings: Map<string, string>): TemplateData {
  const out: TemplateData = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = Array.isArray(value) ? value.map(row => withPhotoDrawings(row, drawings)) : value;
  }
  if (typeof data.photo_id === 'string') {
    const missing = typeof data.photo_missing_text === 'string' ? data.photo_missing_text : '';
    out.photo_drawing = drawings.get(data.photo_id) ?? textParagraph(missing);
  }
  return out;
}

export function renderDocx(template: Uint8Array, data: TemplateData, images: ImageInput[]): Uint8Array {
  let zip: PizZip;
  try {
    zip = new PizZip(template);
  } catch (e) {
    throw new RenderError(`template is not a valid .docx: ${(e as Error).message}`, []);
  }
  const drawings = embedImages(zip, images);

  let doc: Docxtemplater;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });
    doc.render(withPhotoDrawings(data, drawings) as Record<string, unknown>);
  } catch (e) {
    throw toRenderError(e);
  }
  return doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' });
}
