import * as fs from 'fs';
import * as path from 'path';
import { SRC_ROOT } from '../driftGuard';

const APP_DIR = path.join(SRC_ROOT, 'app');

// Deliberately NOT global-flagged: `.test()` on a /g regex advances
// lastIndex between calls, which silently skips matches when the same
// pattern object is reused across many files — same rationale as
// driftGuard.ts's HEX_PATTERN / NUMERIC_TOKEN_PATTERN.
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;

function listFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function findTestFilesUnderApp(): string[] {
  return listFiles(APP_DIR)
    .filter(file => TEST_FILE_PATTERN.test(file))
    .map(file => path.relative(SRC_ROOT, file).split(path.sep).join('/'));
}

// src/app is expo-router's file-based route directory: every .tsx (and .ts)
// file under it is enumerated by getRoutesCore and `require`d as a route
// module at app startup, regardless of what it actually exports. A test file
// placed there — home.test.tsx once was — gets loaded that way too, and its
// module-scope jest.mock() calls execute in the real app's JS runtime and
// throw "Property 'jest' doesn't exist", redboxing the app on launch. Jest
// itself never catches this: the suite passes fine, since jest.mock() is a
// real, defined global while the test is actually running under Jest. This
// guard fails the moment a *.test.*/*.spec.* file reappears under src/app, so
// the drift is caught by `npm test` instead of on a physical device.
describe('expo-router route directory guard', () => {
  it('has no test files under src/app, since expo-router loads every file there as a route', () => {
    const offenders = findTestFilesUnderApp();

    if (offenders.length > 0) {
      throw new Error(
        `Found test file(s) inside src/app, expo-router's route directory: ` +
          `${offenders.join(', ')}. expo-router enumerates and loads every ` +
          `file under src/app as a route at runtime, so a test file's ` +
          `module-scope jest.mock() calls execute in the app's JS runtime ` +
          `and throw "Property 'jest' doesn't exist", crashing the app on ` +
          `launch (Jest never catches this — the suite passes regardless). ` +
          `Move the offending file(s) into the matching feature's ` +
          `__tests__ directory (e.g. src/features/<feature>/__tests__/) ` +
          `instead.`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
