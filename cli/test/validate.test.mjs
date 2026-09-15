import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, readFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(testDir, "..", "dist", "index.js");
const schemasDir = path.resolve(testDir, "..", "..", ".agents", "schemas");

function fixture(handoff) {
  const root = mkdtempSync(path.join(os.tmpdir(), "lp-validate-"));
  const agents = path.join(root, ".agents");
  const pair = path.join(agents, "local", "mike", "codex");
  mkdirSync(pair, { recursive: true });
  writeFileSync(path.join(pair, "handoff.md"), handoff);
  return root;
}

function validate(root) {
  return execFileSync(
    process.execPath,
    [bin, "validate", "--schemas-dir", schemasDir],
    { cwd: root, encoding: "utf8" },
  );
}

function validateResult(root) {
  return spawnSync(
    process.execPath,
    [bin, "validate", "--schemas-dir", schemasDir],
    { cwd: root, encoding: "utf8" },
  );
}

const checklist = `
**Session close checklist (self-verified):**
- [x] activity.log contains an entry for this session
- [x] decisions.jsonl appended (if any decision was made)
- [x] local pair lessons appended (if a personal lesson emerged)
- [x] project LESSONS.md appended (if a project-level lesson emerged)
- [x] JOURNAL significance answered explicitly
- [x] commit convention followed (if commits were made)
- [x] version bumps applied (if rules changed)
- [x] active session row removed on close
`;

test("validate does not skip populated handoffs that mention pristine markers", () => {
  const root = fixture(`# handoff.md — Current operational state
> Version: 2.0 | Updated: 2026-09-10

**Last Agent:** [Mike / Codex]
**Timestamp:** 2026-09-10 06:15
**Status:** STABLE
**Last Action:** Documented the YYYY-MM-DD timestamp format.
**Pending Step:** None
**Blockers/Context:** None
**Open Threads:** Replace [Your Agent Signature] in examples later.
${checklist}`);

  try {
    const output = validate(root);
    assert.match(output, /1 passed/);
    assert.doesNotMatch(output, /skipped/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("validate visibly skips the genuine pristine handoff scaffold", () => {
  const root = fixture(`# handoff.md — Current operational state
> Version: 2.0 | Updated: YYYY-MM-DD

**Last Agent:** [Your Agent Signature]
**Timestamp:** YYYY-MM-DD HH:MM
**Status:** STABLE
**Last Action:** <1 sentence>
**Pending Step:** <what's next or "None">
**Blockers/Context:** <errors, files, warnings, or "None">
**Open Threads:** <unrelated pending items, or "None">
${checklist}`);

  try {
    const output = validate(root);
    assert.match(output, /pristine template \(skipped\)/);
    assert.match(output, /0 passed, 1 skipped/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const fencedIdentityExamples = {
  Updated: "> Version: 2.0 | Updated: YYYY-MM-DD",
  "Last Agent": "**Last Agent:** [Your Agent Signature]",
};

for (const [identity, example] of Object.entries(fencedIdentityExamples)) {
  for (const [lineEnding, newline] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
    for (const validity of ["valid", "invalid"]) {
      test(`validate reports ${validity} populated handoff with fenced ${identity} example (${lineEnding})`, () => {
        const status = validity === "valid" ? "STABLE" : "NOT_A_STATUS";
        const handoff = `# handoff.md — Current operational state
> Version: 2.0 | Updated: 2026-09-10

**Last Agent:** [Mike / Codex]
**Timestamp:** 2026-09-10 06:15
**Status:** ${status}
**Last Action:** Added an identity-field example.
**Pending Step:** None
**Blockers/Context:** None
**Open Threads:** Documentation example follows:
\`\`\`markdown
${example}
\`\`\`
${checklist}`.replaceAll("\n", newline);
        const root = fixture(handoff);

        try {
          const result = validateResult(root);
          assert.doesNotMatch(result.stdout, /pristine template|skipped/);
          if (validity === "valid") {
            assert.equal(result.status, 0, result.stdout + result.stderr);
            assert.match(result.stdout, /1 passed/);
          } else {
            assert.equal(result.status, 1, result.stdout + result.stderr);
            assert.match(result.stdout, /must be equal to one of the allowed values/);
          }
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      });
    }
  }
}

test("validate reports malformed populated handoff even when fenced content contains a pristine identity example", () => {
  const root = fixture(`# handoff.md — Current operational state
> Version: 2.0 | Updated: 2026-09-10

**Last Agent:** [Mike / Codex]
**Status:** STABLE
**Last Action:** Added an example.
**Pending Step:** None
**Blockers/Context:** None
**Open Threads:** Documentation example follows:
\`\`\`markdown
**Last Agent:** [Your Agent Signature]
\`\`\`
${checklist}`);

  try {
    const result = validateResult(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /pristine template|skipped/);
    assert.match(result.stdout, /parse error — missing field: Timestamp/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Shared acceptance cases with Python, through the real CLI in a plain directory.
const integrityCases = JSON.parse(readFileSync(path.resolve(testDir,
  '../../.agents/scripts/fixtures/integrity-cases.json'), 'utf8'));
function integrityFixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'lp-integrity-'));
  mkdirSync(path.join(root, '.agents', 'schemas'), { recursive: true });
  cpSync(schemasDir, path.join(root, '.agents', 'schemas'), { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function integrityRun(root) {
  return spawnSync(process.execPath, [process.env.LEAD_PROTOCOL_TEST_BIN || bin, 'validate'], {
    cwd: root, encoding: 'utf8', env: { ...process.env, PATH: path.join(root, 'no-executables') },
  });
}
for (const c of integrityCases) {
  for (const [name, newline] of [['LF', '\n'], ['CRLF', '\r\n']]) {
    test(`successor markdown parity: ${c.name} (${name})`, (t) => {
      const root = integrityFixture(t);
      writeFileSync(path.join(root, '.agents', 'LESSONS.md'), c.text.replaceAll('\n', newline));
      const r = integrityRun(root);
      const output = r.stdout + r.stderr;
      assert.equal(r.status, c.markers.length + c.h1.length ? 1 : 0, output);
      for (const [label, expected] of [['unresolved merge conflict marker', c.markers],
        ['duplicated top-level header', c.h1]]) {
        const actual = [...output.matchAll(new RegExp(`line (\\d+): ${label}`, 'g'))].map(m => Number(m[1]));
        assert.deepEqual(actual, expected, output);
      }
    });
  }
}
for (const filename of ['handoff.md', 'active_sessions.md']) {
  for (const fence of ['```', '~~~']) {
    for (const [name, newline] of [['LF', '\n'], ['CRLF', '\r\n']]) {
      for (const realMarkers of [false, true]) {
        test(`successor state fence parity: ${filename} ${fence} ${name} real=${realMarkers}`, (t) => {
          const root = integrityFixture(t);
          const directory = path.join(root, '.agents',
            filename === 'handoff.md' ? 'local/mike/codex' : 'sessions');
          mkdirSync(directory, { recursive: true });
          const prefix = filename === 'handoff.md' ? `# handoff.md
> Version: 2.0 | Updated: 2026-09-13
**Last Agent:** [Mike / Codex]
**Timestamp:** 2026-09-13 20:15
**Status:** STABLE
**Last Action:** Added conflict-marker examples.
**Pending Step:** None
**Blockers/Context:** None
**Open Threads:** None
${checklist}` : '# Active sessions\n';
          const markers = '<<<<<<< HEAD\n||||||| base\n=======\n>>>>>>> incoming\n';
          let text = prefix + `${fence}diff\n${markers}${fence}\n`;
          const expected = [];
          if (realMarkers) {
            const start = text.split('\n').length;
            expected.push(start, start + 1, start + 2, start + 3);
            text += markers;
          }
          writeFileSync(path.join(directory, filename), text.replaceAll('\n', newline));
          const r = integrityRun(root);
          const output = r.stdout + r.stderr;
          assert.equal(r.status, realMarkers ? 1 : 0, output);
          assert.doesNotMatch(output, /pristine template/);
          const actual = [...output.matchAll(/line (\d+): unresolved merge conflict marker/g)]
            .map(m => Number(m[1]));
          assert.deepEqual(actual, expected, output);
        });
      }
    }
  }
}
for (const [text, label] of [['```\n<<<<<<< HEAD\n```\n', 'conflict marker'],
  ['```\nnot json\n```\n', 'invalid JSON'], ['{}{}\n', 'invalid JSON']]) {
  test(`successor JSONL does not skip fences: ${JSON.stringify(text)}`, (t) => {
    const root = integrityFixture(t);
    writeFileSync(path.join(root, '.agents', 'decisions.jsonl'), text);
    const r = integrityRun(root);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok((r.stdout + r.stderr).includes(label), r.stdout + r.stderr);
  });
}
test('successor generic validation works without Git executable or repository', (t) => {
  const root = integrityFixture(t);
  assert.equal(existsSync(path.join(root, '.git')), false);
  assert.equal(spawnSync('git', ['--version'], {env: {PATH: path.join(root, 'no-executables')}}).error?.code, 'ENOENT');
  writeFileSync(path.join(root, '.agents', 'JOURNAL.md'), '# Journal\n');
  const r = integrityRun(root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
