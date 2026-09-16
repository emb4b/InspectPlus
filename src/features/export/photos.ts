import { Image } from 'react-native';
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
    // Each ImageRef renderAsync() hands back is a native SharedObject holding
    // a fully decoded bitmap — on a 4 GB device, twenty 12 MP photos decoded
    // TWICE (once just to read dimensions, once to actually resize/save, as
    // this used to) can OOM the app. Image.getSize reads the dimensions from
    // the file's header without decoding pixels, so there's exactly one
    // renderAsync() per photo below.
    const { width, height } = await Image.getSize(uri);
    const context = ImageManipulator.manipulate(uri);
    const longest = Math.max(width, height);
    if (longest > MAX_PHOTO_EDGE) {
      const scale = MAX_PHOTO_EDGE / longest;
      context.resize({ width: Math.round(width * scale), height: Math.round(height * scale) });
    }
    const rendered = await context.renderAsync();
    let saved;
    try {
      saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    } finally {
      // Detach the native bitmap as soon as it's written to disk, rather
      // than waiting on the JS garbage collector — the whole point of doing
      // this at all (see the comment above).
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
  } catch {
    return null;
  }
}
