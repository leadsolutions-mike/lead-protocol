import { lstatSync, readFileSync, writeFileSync } from "node:fs";

interface IndexPlan {
  destination: string;
  bytes: Buffer;
}

function isRegularOrMissing(file: string): boolean {
  try {
    if (!lstatSync(file).isFile()) {
      throw new Error(`INDEX.md must be a regular file, not a symlink or other type: ${file}`);
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** Read-only validation of both paths, before any init mutation. */
export function preflightIndex(source: string, destination: string): IndexPlan {
  if (!isRegularOrMissing(source)) {
    throw new Error(`Required INDEX.md seed is missing: ${source}`);
  }
  // Read now so an unreadable required source also refuses before init writes.
  const bytes = readFileSync(source);
  isRegularOrMissing(destination);
  return { destination, bytes };
}

/** Exclusive creation; never overwrite a consumer map, including a racing one. */
export function installIndex(plan: IndexPlan): "created" | "preserved" {
  try {
    writeFileSync(plan.destination, plan.bytes, { flag: "wx" });
    return "created";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (isRegularOrMissing(plan.destination)) return "preserved";
    throw new Error(`INDEX.md changed during exclusive creation: ${plan.destination}`);
  }
}
