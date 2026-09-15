// Source project logs retain their append-only history. Consumer seeds retain
// only the canonical preamble through the explicit empty-state marker.
const markers = new Map([
  ['JOURNAL.md', '*(No entries yet — this file accumulates as the project ships.)*'],
  ['LESSONS.md', '*(No lessons yet — this file accumulates as reusable knowledge emerges.)*'],
]);
export const projectLogNames = [...markers.keys()];

export function pristineProjectLog(name, text) {
  const marker = markers.get(name);
  if (!marker) throw new Error(`Unsupported project log seed: ${name}`);
  // Split physical LF/CRLF lines only; do not reinterpret Unicode separators.
  const lines = text.split('\n');
  const boundaries = lines.flatMap((line, index) =>
    line.replace(/\r$/, '') === marker ? [index] : []);
  if (boundaries.length !== 1) {
    throw new Error(`${name}: expected exactly one canonical empty-state marker line; found ${boundaries.length}`);
  }
  const boundary = boundaries[0];
  const preamble = lines.slice(0, boundary).join('\n');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  return preamble + (boundary ? '\n' : '') + marker + newline;
}
