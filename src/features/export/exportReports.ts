import PizZip from 'pizzip';
import { mapBundle } from './mappers';
import { renderDocx } from './render/renderDocx';
import { templateFor, TemplateEntry } from './templates';
import { docxFileName, uniqueFileNames, zipFileName } from './fileNames';
import type { Viewer } from './loadReportBundle';
import type { ExportFailure, ExportPhoto, ExportResult, ImageInput, ReportBundle, Signatories, TemplateData } from './types';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const ZIP_MIME = 'application/zip';
const EXPORT_DIR = 'exports';

export interface ExportItem {
  key: string;
  kind: 'inspection' | 'survey';
  reportId: string;
  reportType: string;
  title: string;
  estabName: string;
  date: string;
}

export interface ExportProgress {
  index: number;
  total: number;
  title: string;
}

export interface ExportOptions {
  signatories: Signatories;
  onProgress?: (progress: ExportProgress) => void;
  isCancelled?: () => boolean;
}

// Everything that touches the device, behind an interface so the sequencing
// rules below are unit-tested with fakes. deviceExportPorts is the real one.
export interface ExportPorts {
  loadBundle(item: ExportItem): Promise<ReportBundle>;
  loadTemplate(entry: TemplateEntry): Promise<Uint8Array>;
  preparePhoto(photo: ExportPhoto): Promise<ImageInput | null>;
  render(template: Uint8Array, data: TemplateData, images: ImageInput[]): Uint8Array;
  files: {
    resetExportDir(): Promise<string>;
    write(dir: string, name: string, bytes: Uint8Array): Promise<string>;
  };
  zip(entries: { name: string; bytes: Uint8Array }[]): Uint8Array;
  share(uri: string, mimeType: string): Promise<void>;
  now(): Date;
}

const reason = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Unknown error');

export async function exportReports(items: ExportItem[], options: ExportOptions, ports: ExportPorts): Promise<ExportResult> {
  const dir = await ports.files.resetExportDir();
  const rendered: { name: string; bytes: Uint8Array }[] = [];
  const failures: ExportFailure[] = [];
  let skippedPhotos = 0;
  let cancelled = false;

  const names = uniqueFileNames(items.map(i => docxFileName(templateFor(i.kind, i.reportType)?.label ?? i.title, i.estabName, i.date)));

  for (let i = 0; i < items.length; i += 1) {
    if (options.isCancelled?.()) {
      cancelled = true;
      break;
    }
    const item = items[i];
    options.onProgress?.({ index: i + 1, total: items.length, title: item.estabName });
    try {
      const entry = templateFor(item.kind, item.reportType);
      if (!entry) throw new Error(`No template for ${item.title} yet`);
      const [template, bundle] = await Promise.all([ports.loadTemplate(entry), ports.loadBundle(item)]);
      const data = mapBundle(bundle, { signatories: options.signatories });
      const images: ImageInput[] = [];
      for (const photo of bundle.photos) {
        const image = await ports.preparePhoto(photo);
        if (image) images.push(image);
        else skippedPhotos += 1;
      }
      rendered.push({ name: names[i], bytes: ports.render(template, data, images) });
    } catch (e) {
      failures.push({ key: item.key, title: `${item.title} — ${item.estabName}`, reason: reason(e) });
    }
  }

  let shareUri: string | null = null;
  if (rendered.length === 1) {
    shareUri = await ports.files.write(dir, rendered[0].name, rendered[0].bytes);
    await ports.share(shareUri, DOCX_MIME);
  } else if (rendered.length > 1) {
    for (const file of rendered) await ports.files.write(dir, file.name, file.bytes);
    shareUri = await ports.files.write(dir, zipFileName(ports.now()), ports.zip(rendered));
    await ports.share(shareUri, ZIP_MIME);
  }

  return { shareUri, succeeded: rendered.length, failures, skippedPhotos, cancelled };
}

// ── The real ports ──────────────────────────────────────────────────────────
//
// Pulled in with `require` inside this function, not `import` at module
// scope: `loadReportBundle` drags in the WatermelonDB SQLite adapter, and
// expo-asset/expo-file-system/expo-sharing are native modules — none of
// them load cleanly under Jest, and this file's own exportReports() is
// unit-tested with fake ExportPorts that never call deviceExportPorts at
// all. Keeping the imports lazy keeps that test import-safe.
export function deviceExportPorts(viewer: Viewer): ExportPorts {
  /* eslint-disable @typescript-eslint/no-require-imports, global-require */
  const { loadReportBundle } = require('./loadReportBundle') as typeof import('./loadReportBundle');
  const { preparePhoto } = require('./photos') as typeof import('./photos');
  const { Asset } = require('expo-asset') as typeof import('expo-asset');
  const { Directory, File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  /* eslint-enable @typescript-eslint/no-require-imports, global-require */

  return {
    loadBundle: item => loadReportBundle(item, viewer),
    async loadTemplate(entry) {
      const asset = Asset.fromModule(entry.module);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error(`Template ${entry.file} could not be loaded`);
      return new File(asset.localUri).bytes();
    },
    preparePhoto,
    render: renderDocx,
    files: {
      async resetExportDir() {
        const dir = new Directory(Paths.cache, EXPORT_DIR);
        if (dir.exists) dir.delete();
        dir.create();
        return dir.uri;
      },
      async write(dirUri, name, bytes) {
        const file = new File(dirUri, name);
        file.create();
        file.write(bytes);
        return file.uri;
      },
    },
    zip(entries) {
      const zip = new PizZip();
      for (const e of entries) zip.file(e.name, e.bytes, { compression: 'STORE' });
      return zip.generate({ type: 'uint8array' });
    },
    async share(uri, mimeType) {
      await Sharing.shareAsync(uri, { mimeType, UTI: mimeType === ZIP_MIME ? 'public.zip-archive' : 'org.openxmlformats.wordprocessingml.document' });
    },
    now: () => new Date(),
  };
}
