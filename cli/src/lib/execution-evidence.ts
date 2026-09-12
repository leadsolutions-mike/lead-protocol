import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

export type EvidenceResult = "passed" | "failed" | "not_run" | "blocked";
export interface ExecutionEvidence {
  git?: { branch?: string; commit?: string; files_changed?: number };
  environment?: { runtime?: string; package_manager?: string; cwd?: string; ci_run?: string };
  checks?: { command: string; cwd?: string; result: EvidenceResult; reason?: string; artifact?: string; ci_run?: string }[];
  browser_validation?: { performed: boolean; result: EvidenceResult; reason?: string; flow?: string; evidence?: string };
  unresolved?: string[];
}

/** Structural validation only: a valid record is not proof that commands ran. */
export function validateEvidence(data: unknown, schemasDir: string): ExecutionEvidence {
  try {
    const schema = JSON.parse(readFileSync(path.join(schemasDir, "execution-evidence.schema.json"), "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
    const validate = ajv.compile(schema);
    if (!validate(data)) throw new Error(ajv.errorsText(validate.errors, { dataVar: "execution_evidence" }));
    return data as ExecutionEvidence;
  } catch (error) {
    throw new Error(`Invalid execution evidence: ${(error as Error).message}`);
  }
}

export function loadEvidence(file: string): unknown {
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { throw new Error(`Invalid execution evidence JSON at ${file}: ${(error as Error).message}`); }
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, sorted(item)]));
  }
  return value;
}

/** Escape fence/HTML characters without changing the JSON value. No parallel human table. */
export function renderEvidenceMarkdown(data: ExecutionEvidence): string {
  const json = JSON.stringify(sorted({ execution_evidence: data }), null, 2)
    .replace(/[`<>&\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return `\n## Execution Evidence\n\n\`\`\`json\n${json}\n\`\`\`\n`;
}

/** Read the reserved canonical section; legacy bodies without it remain untouched. */
export function parseEvidenceMarkdown(markdown: string, schemasDir: string): ExecutionEvidence | undefined {
  const headings = [...markdown.matchAll(/^## Execution Evidence[ \t]*\r?$/gm)];
  if (headings.length === 0) return undefined;
  if (headings.length !== 1) throw new Error("Duplicate execution evidence sections");
  const section = markdown.slice(headings[0].index! + headings[0][0].length);
  const match = /^\s*```json\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n|$)/.exec(section);
  if (!match) throw new Error("Malformed execution evidence JSON section");
  try {
    const envelope = JSON.parse(match[1]);
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) || Object.keys(envelope).length !== 1 || !Object.hasOwn(envelope, "execution_evidence")) throw new Error("expected only execution_evidence in envelope");
    return validateEvidence(envelope.execution_evidence, schemasDir);
  } catch (error) { throw new Error(`Invalid execution evidence section: ${(error as Error).message}`); }
}

export function parseCloseReceiptEvidence(receipt: unknown, schemasDir: string): ExecutionEvidence | undefined {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new Error("Invalid execution evidence receipt object");
  if (!Object.hasOwn(receipt, "execution_evidence")) return undefined;
  return validateEvidence((receipt as { execution_evidence: unknown }).execution_evidence, schemasDir);
}
