import * as fs from 'fs';
import * as path from 'path';

export const SRC_ROOT = path.resolve(__dirname, '..');
export const DESIGN_DIR = __dirname;

// Deliberately NOT global-flagged: `.test()` on a /g regex advances
// lastIndex between calls, which silently skips matches when the same
// pattern object is reused across many files.
export const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/;
export const NUMERIC_TOKEN_PATTERN = /\b(fontSize|borderRadius)\s*:\s*[0-9]+(\.[0-9]+)?\b/;

export function listTsxFiles(dir: string = SRC_ROOT, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listTsxFiles(full, files);
    } else if (entry.isFile() && full.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

export function toRelative(file: string): string {
  return path.relative(SRC_ROOT, file).split(path.sep).join('/');
}

export function findOffenders(pattern: RegExp, allow: Set<string>): string[] {
  return listTsxFiles()
    .filter(file => !file.startsWith(DESIGN_DIR))
    .map(toRelative)
    .filter(rel => !allow.has(rel))
    .filter(rel => pattern.test(fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8')));
}
