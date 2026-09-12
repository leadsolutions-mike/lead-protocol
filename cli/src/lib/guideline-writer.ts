import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { preflightPath } from "./safe-path.js";

const TAG_OPEN = "<lead-protocol>";
const TAG_CLOSE = "</lead-protocol>";

export type WriteResult = "new" | "replaced" | "noop";

export function writeGuidelines(filePath: string, guidelines: string): WriteResult {
  if (!guidelines.trim()) return "noop";
  preflightPath(filePath, "file");
  const original = existsSync(filePath) ? readFileSync(filePath) : Buffer.alloc(0);
  const block = Buffer.from(`${TAG_OPEN}\n${guidelines.trimEnd()}\n\n${TAG_CLOSE}`);
  const start = original.indexOf(TAG_OPEN);
  const end = start < 0 ? -1 : original.indexOf(TAG_CLOSE, start + TAG_OPEN.length);
  const replaced = end >= 0;
  // Work in bytes: even unusual line endings or non-UTF8 user text outside
  // the managed region must survive unchanged.
  const content = replaced
    ? Buffer.concat([original.subarray(0, start), block, original.subarray(end + TAG_CLOSE.length)])
    : Buffer.concat([original, Buffer.from(original.length ? "\n\n===\n\n" : ""), block, Buffer.from("\n")]);
  if (content.equals(original)) return "noop";
  writeFileSync(filePath, content);
  return replaced ? "replaced" : "new";
}
