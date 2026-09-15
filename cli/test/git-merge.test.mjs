import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const bin = process.env.LEAD_PROTOCOL_TEST_BIN || fileURLToPath(new URL('../dist/index.js', import.meta.url));
const templates = path.join(path.dirname(bin), 'templates', '.agents');
const decision = (name) => JSON.stringify({timestamp: '2026-09-13T20:00:00Z', agent: `[${name}]`,
  decision: name, rationale: 'Local merge fixture', files_affected: [], status: 'completed'}) + '\n';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'lp-union-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = {...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid'};
  function git(args, expected = 0) {
    const r = spawnSync('git', args, {cwd: root, env, encoding: 'utf8'});
    assert.equal(r.status, expected, `${args.join(' ')}\n${r.stdout}${r.stderr}`);
    return r.stdout;
  }
  const file = (name) => path.join(root, '.agents', name);
  mkdirSync(file('sessions'), {recursive: true});
  cpSync(path.join(templates, '.gitattributes'), file('.gitattributes'));
  cpSync(path.join(templates, 'schemas'), file('schemas'), {recursive: true});
  for (const name of ['JOURNAL.md', 'LESSONS.md']) writeFileSync(file(name), '# Log\n');
  writeFileSync(file('decisions.jsonl'), '');
  writeFileSync(file('sessions/active_sessions.md'), '# Sessions\n| base |\n');
  git(['init', '-q']);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.hooksPath', path.join(root, 'no-hooks')]);
  git(['add', '.']); git(['commit', '-qm', 'base']);
  const base = git(['rev-parse', 'HEAD']).trim();
  function branch(name, edits) {
    git(['checkout', '-qb', name, base]);
    for (const [name, content] of Object.entries(edits)) writeFileSync(file(name), content);
    git(['add', '.']); git(['commit', '-qm', name]);
  }
  function validate(expected) {
    const r = spawnSync(process.execPath, [bin, 'validate'], {cwd: root, encoding: 'utf8'});
    assert.equal(r.status, expected, r.stdout + r.stderr);
  }
  return {root, git, file, branch, validate};
}

test('shipped union attributes preserve distinct tails in all three logs', (t) => {
  const f = fixture(t);
  for (const name of ['JOURNAL.md', 'LESSONS.md', 'decisions.jsonl']) {
    assert.match(f.git(['check-attr', 'merge', '--', `.agents/${name}`]), /: union/);
  }
  assert.match(f.git(['check-attr', 'merge', '--', '.agents/sessions/active_sessions.md']), /: unspecified/);
  for (const side of ['left', 'right']) f.branch(side, {
    'JOURNAL.md': `# Log\n## session-${side}\n${side} journal\n`,
    'LESSONS.md': `# Log\n## session-${side}\n${side} lesson\n`,
    'decisions.jsonl': decision(side),
  });
  f.git(['merge', '--no-edit', 'left']);
  for (const name of ['JOURNAL.md', 'LESSONS.md']) {
    const text = readFileSync(f.file(name), 'utf8');
    for (const side of ['left', 'right']) assert.ok(text.includes(`## session-${side}\n${side}`));
  }
  const rows = readFileSync(f.file('decisions.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(r => r.decision).sort(), ['left', 'right']);
  f.validate(0);
});

test('union can collapse same-heading Markdown entry boundaries', (t) => {
  const f = fixture(t);
  for (const side of ['left', 'right']) f.branch(side, {
    'JOURNAL.md': `# Log\n## same-heading\n${side} paragraph\n`,
    'LESSONS.md': `# Log\n## same-heading\n${side} lesson\n`,
  });
  f.git(['merge', '--no-edit', 'left']);
  for (const name of ['JOURNAL.md', 'LESSONS.md']) {
    const text = readFileSync(f.file(name), 'utf8');
    assert.equal(text.split('## same-heading').length - 1, 1);
    assert.ok(text.includes('left') && text.includes('right'));
  }
  f.validate(0); // Structural validation cannot recover entry boundaries.
});

test('byte-identical independent JSONL appends can deduplicate', (t) => {
  const f = fixture(t);
  for (const side of ['left', 'right']) f.branch(side, {'decisions.jsonl': decision('same')});
  f.git(['merge', '--no-edit', 'left']);
  assert.equal(readFileSync(f.file('decisions.jsonl'), 'utf8'), decision('same'));
  f.validate(0);
});

test('mutable sessions remain unspecified and conflicting edits require resolution', (t) => {
  const f = fixture(t);
  assert.match(f.git(['check-attr', 'merge', '--', '.agents/sessions/active_sessions.md']), /: unspecified/);
  for (const side of ['left', 'right']) f.branch(side, {'sessions/active_sessions.md': `# Sessions\n| ${side} |\n`});
  f.git(['merge', '--no-edit', 'left'], 1);
  assert.match(readFileSync(f.file('sessions/active_sessions.md'), 'utf8'), /^<<<<<<< /m);
  f.validate(1);
});
