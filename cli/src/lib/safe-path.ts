import { lstatSync } from "node:fs";
import path from "node:path";

/** Inspect each existing component without following symbolic links. No writes. */
export function preflightPath(filePath: string, kind: "file" | "directory"): void {
  const absolute = path.resolve(filePath);
  const root = path.parse(absolute).root;
  const segments = path.relative(root, absolute).split(path.sep).filter(Boolean);
  let current = root;
  for (let i = 0; i < segments.length; i++) {
    current = path.join(current, segments[i]);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isSymbolicLink()) throw new Error(`Unsafe symbolic link: ${current}`);
    const directory = i < segments.length - 1 || kind === "directory";
    if (directory ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error(`Unsafe path: expected ${directory ? "directory" : "regular file"}: ${current}`);
    }
  }
}

export function safeRelativePath(rel: string): void {
  if (!rel || rel.includes("\\") || rel.includes("\0") || path.isAbsolute(rel) ||
      rel.split("/").some((part) => !part || part === "." || part === "..") ||
      /^[A-Za-z]:/.test(rel) || rel.split("/")[0] === "local") {
    throw new Error(`Unsafe relative path (local is excluded): ${rel}`);
  }
}
