// Names for what the share sheet receives. ASCII-only so every mail client
// and file manager the inspector might pick shows the same name.
export function slugify(s: string): string {
  const ascii = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const slug = ascii.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'report';
}

export function docxFileName(label: string, establishment: string, inspectionDate: string): string {
  const date = /^\d{4}-\d{2}-\d{2}/.exec(inspectionDate)?.[0] ?? 'undated';
  return `${slugify(label)}-${slugify(establishment)}-${date}.docx`;
}

const two = (n: number) => String(n).padStart(2, '0');

export function zipFileName(now: Date): string {
  return `InspectPlus-exports-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}.zip`;
}

export function uniqueFileNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map(name => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot < 0 ? `${name} (${n})` : `${name.slice(0, dot)} (${n})${name.slice(dot)}`;
  });
}
