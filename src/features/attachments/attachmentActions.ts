import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import { supabase } from '../../services/supabase/client';
import { withTimeout } from '../../utils/withTimeout';
import { formatDmsPair, formatStampDate } from './geotagStamp';
import type { Attachment } from '../../db/models/Attachment';

const STORAGE_BUCKET = 'attachments';
const ALBUM_NAME = 'InspectPlus';
// Downloads can be slower than a bare signed-url fetch (the file itself has
// to transfer, not just the URL) — see withTimeout.ts / attachmentUploadQueue.ts
// for why every Storage call in this app needs an explicit bound.
const NETWORK_TIMEOUT_MS = 20000;

// Local file the download/save actions can hand to expo-media-library —
// which only accepts a local file:// uri, never a remote URL. Reuses
// whatever's already on-device if present; otherwise pulls the bytes down
// from a signed URL into a temp cache file first.
async function resolveLocalFileUri(attachment: Attachment): Promise<string> {
  if (attachment.localUri) {
    const file = new File(attachment.localUri);
    if (file.exists) return attachment.localUri;
  }

  if (!attachment.storagePath) {
    throw new Error('This photo has not finished uploading yet — nothing to download.');
  }

  const { data, error } = await withTimeout(
    supabase.storage.from(STORAGE_BUCKET).createSignedUrl(attachment.storagePath, 300),
    NETWORK_TIMEOUT_MS,
    'createSignedUrl'
  );
  if (error || !data) {
    throw new Error('Could not reach the photo — check your connection and try again.');
  }

  const destination = new File(Paths.cache, `download-${attachment.attachmentId}.jpg`);
  const downloaded = await withTimeout(
    File.downloadFileAsync(data.signedUrl, destination),
    NETWORK_TIMEOUT_MS,
    'downloadFileAsync'
  );
  return downloaded.uri;
}

// Saves into a dedicated "InspectPlus" album rather than dumping straight
// into the camera roll, so photos saved from reports stay grouped and easy
// to find rather than mixed in with the user's own camera photos.
export async function downloadAttachmentToGallery(attachment: Attachment): Promise<void> {
  // writeOnly: true — this only ever adds photos, never reads the existing
  // library, so it doesn't need (and shouldn't prompt for) read access.
  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  if (status !== 'granted') {
    throw new Error('Photo library permission is required to save this photo.');
  }

  const localUri = await resolveLocalFileUri(attachment);
  const asset = await MediaLibrary.createAssetAsync(localUri);

  // getAlbumAsync's own doc comment says it returns null when no album with
  // that name exists yet — the .d.ts return type (`Promise<Album>`) doesn't
  // reflect that, hence the cast.
  const album = (await MediaLibrary.getAlbumAsync(ALBUM_NAME)) as MediaLibrary.Album | null;
  if (album) {
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
  } else {
    await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset, false);
  }
}

export function formatAttachmentDetailsText(attachment: Attachment): string {
  const lines = [
    `File: ${attachment.fileName}`,
    `Captured: ${formatStampDate(new Date(attachment.capturedAt))}`,
  ];

  if (attachment.geoLat != null && attachment.geoLng != null) {
    lines.push(`Coordinates (DMS): ${formatDmsPair(attachment.geoLat, attachment.geoLng)}`);
    lines.push(`Coordinates (decimal): ${attachment.geoLat.toFixed(6)}, ${attachment.geoLng.toFixed(6)}`);
  } else {
    lines.push('Coordinates: not recorded');
  }

  return lines.join('\n');
}

export async function copyAttachmentDetails(attachment: Attachment): Promise<void> {
  await Clipboard.setStringAsync(formatAttachmentDetailsText(attachment));
}
