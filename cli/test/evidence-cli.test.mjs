import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, realpathSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));
test('CLI evidence JSON roundtrip, rejected inputs leave state intact and close retains checklist guard', () => {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'lp-evidence-cli-')));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  try {
    cpSync(new URL('../dist/templates/.agents/', import.meta.url), path.join(root, '.agents'), { recursive: true });
    const rules = path.join(root, '.agents/PROJECT_RULES.md');
    writeFileSync(rules, readFileSync(rules, 'utf8').replace(/^- \*\*Active modules:\*\*.*$/m, '- **Active modules:** none'));
    assert.equal(run('session', 'open', '--actor', 'test', '--agent', 'codex', '--topic', 'evidence').status, 0);
    const pair = ['--actor', 'test', '--agent', 'codex'];
    const closing = ['session', 'close', ...pair, '--journal', 'not-significant', '--status', 'stable', '--last-action', 'Verified', '--pending-step', 'Review', '--json'];
    writeFileSync(path.join(root, 'body.md'), 'Executed checks.');
    const checkpoint = ['checkpoint', ...pair, '--title', 'evidence', '--file', 'body.md', '--json'];
    const state = () => [readFileSync(path.join(root, '.agents/sessions/active_sessions.md'), 'utf8'), readFileSync(path.join(root, '.agents/local/test/codex/handoff.md'), 'utf8'), readdirSync(path.join(root, '.agents/checkpoints')), readdirSync(path.join(root, '.agents/local/test/codex/receipts'))];
    for (const input of ['{malformed', '{"checks":[{"command":"test","result":"blocked","reason":" "}]}']) {
      writeFileSync(path.join(root, 'evidence.json'), input);
      const before = state();
      for (const args of [checkpoint, [...closing, '--confirm-checklist']]) {
        const result = run(...args, '--evidence', 'evidence.json');
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /execution evidence/i);
        assert.deepEqual(state(), before);
      }
    }
    const evidence = { checks: [{ command: 'test', result: 'not_run', reason: 'Illustrative CLI fixture' }] };
    writeFileSync(path.join(root, 'evidence.json'), JSON.stringify(evidence));
    const created = run(...checkpoint, '--evidence', 'evidence.json');
    assert.equal(created.status, 0, created.stderr);
    assert.match(readFileSync(JSON.parse(created.stdout).checkpoint, 'utf8'), /execution_evidence/);
    const unconfirmed = run(...closing, '--evidence', 'evidence.json');
    assert.notEqual(unconfirmed.status, 0);
    assert.match(unconfirmed.stderr, /confirm-checklist/);
    const closed = run(...closing, '--evidence', 'evidence.json', '--confirm-checklist');
    assert.equal(closed.status, 0, closed.stderr);
    assert.deepEqual(JSON.parse(closed.stdout).execution_evidence, evidence);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
