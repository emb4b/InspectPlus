import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { resolveLocalFileUri } from '../attachments/attachmentActions';
import type { ExportPhoto, ImageInput } from './types';

// A camera photo can be 4–6 MB; twenty of them would make a 100 MB .docx
// that no mail client will take. Long edge capped at 1600 px, JPEG 0.8 —
// still legible on an A4 print at the 3-inch box the form gives it.
export const MAX_PHOTO_EDGE = 1600;

// Best effort: the local file if the phone took the photo, else a download
// (resolveLocalFileUri already applies the network timeout). Null when
// neither works — the form prints "(photo not downloaded)" instead.
export async function preparePhoto(photo: ExportPhoto): Promise<ImageInput | null> {
  let uri: string;
  try {
    // resolveLocalFileUri reads only these three fields off the model, and
    // ExportPhoto already carries them with the same shape.
    uri = await resolveLocalFileUri(photo);
  } catch (e) {
    console.warn('[export] photo unavailable', photo.attachmentId, e);
    return null;
  }
  try {
    // Read dimensions off the first render rather than a header-only probe
    // (Image.getSize rejects for this app's file:///…/cache/download-<id>.jpg
    // and attachments-dir URIs on this RN build — silently, which is exactly
    // why every photo came back null and nothing showed up in logcat). Each
    // ImageRef is a native SharedObject holding a fully decoded bitmap, so
    // it's released the moment it's no longer needed to keep at most one
    // alive at a time — before the resized re-render below when a resize is
    // needed, or right after saveAsync() when the original is reused as-is.
    const context = ImageManipulator.manipulate(uri);
    const original = await context.renderAsync();
    const { width, height } = original;
    const longest = Math.max(width, height);
    const needsResize = longest > MAX_PHOTO_EDGE;

    let rendered = original;
    if (needsResize) {
      original.release();
      const scale = MAX_PHOTO_EDGE / longest;
      context.resize({ width: Math.round(width * scale), height: Math.round(height * scale) });
      rendered = await context.renderAsync();
    }

    let saved;
    try {
      saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    } finally {
      // The resized render (or the original, when no resize was needed) is
      // done being read from once saveAsync() has written it to disk.
      rendered.release();
    }
    try {
      const bytes = await new File(saved.uri).bytes();
      return { id: photo.attachmentId, bytes, mime: 'image/jpeg', width: saved.width, height: saved.height };
    } finally {
      // Best-effort cleanup of the manipulator's temp output file in the
      // cache dir — a failed delete shouldn't turn an otherwise-successful
      // photo into a null (and thus a "(not downloaded)" placeholder).
      try {
        new File(saved.uri).delete();
      } catch {
        // ignored — see comment above
      }
    }
  } catch (e) {
    console.warn('[export] photo unavailable', photo.attachmentId, e);
    return null;
  }
}
