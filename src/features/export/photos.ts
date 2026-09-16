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
// neither works — the form prints "<file> (not downloaded)" instead.
export async function preparePhoto(photo: ExportPhoto): Promise<ImageInput | null> {
  let uri: string;
  try {
    // resolveLocalFileUri reads only these three fields off the model, and
    // ExportPhoto already carries them with the same shape.
    uri = await resolveLocalFileUri(photo);
  } catch {
    return null;
  }
  try {
    const context = ImageManipulator.manipulate(uri);
    const original = await context.renderAsync();
    const longest = Math.max(original.width, original.height);
    if (longest > MAX_PHOTO_EDGE) {
      const scale = MAX_PHOTO_EDGE / longest;
      context.resize({ width: Math.round(original.width * scale), height: Math.round(original.height * scale) });
    }
    const saved = await (await context.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    const bytes = await new File(saved.uri).bytes();
    return { id: photo.attachmentId, bytes, mime: 'image/jpeg', width: saved.width, height: saved.height };
  } catch {
    return null;
  }
}
