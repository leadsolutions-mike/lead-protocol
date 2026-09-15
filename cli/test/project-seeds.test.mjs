import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const bin = process.env.LEAD_PROTOCOL_TEST_BIN ?? path.join(root, 'cli/dist/index.js');
const logs = ['JOURNAL.md', 'LESSONS.md'];
const { pristineProjectLog } = await import('../scripts/project-log-seeds.mjs');
function consumer(t) {
  const target = mkdtempSync(path.join(os.tmpdir(), 'lp-pristine-logs-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [bin, ...args], { cwd: target, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  return { target, run, file: name => path.join(target, '.agents', name) };
}
function assertPristine(file, name) {
  const text = readFileSync(file, 'utf8');
  assert.ok(text.startsWith(`# ${name}`));
  assert.match(text, name === 'JOURNAL.md' ? /No entries yet/ : /No lessons yet/);
  assert.doesNotMatch(text, /^## \d{4}-\d{2}-\d{2}\b/m, 'consumer must not inherit source history');
  assert.doesNotMatch(text, /\.agents\/checkpoints\//, 'empty seed must not point to source-only evidence');
  assert.ok(text.endsWith('\n'));
}

test('fresh installed project logs are pristine and source history stays unchanged', t => {
  const before = logs.map(name => readFileSync(path.join(root, '.agents', name)));
  const { run, file } = consumer(t);
  run('init', '--yes');
  for (const [i, name] of logs.entries()) {
    assertPristine(file(name), name);
    assert.deepEqual(readFileSync(path.join(root, '.agents', name)), before[i]);
  }
});

test('update recreates missing history seeds while preserving populated consumer bytes', t => {
  const { run, file } = consumer(t);
  run('init', '--yes');
  const owned = Buffer.from('# JOURNAL.md\r\n\r\n## 2026-01-01 | owner | Local delivery\r\nUnicode \u2028 stays here.\r\n');
  writeFileSync(file('JOURNAL.md'), owned);
  rmSync(file('LESSONS.md'));
  run('update', '--yes');
  assert.deepEqual(readFileSync(file('JOURNAL.md')), owned);
  assertPristine(file('LESSONS.md'), 'LESSONS.md');
  rmSync(file('JOURNAL.md'));
  const lessons = Buffer.from('# LESSONS.md\n\n## 2026-01-01 | owner | Local lesson\nKeep me.\n');
  writeFileSync(file('LESSONS.md'), lessons);
  run('update', '--yes');
  assertPristine(file('JOURNAL.md'), 'JOURNAL.md');
  assert.deepEqual(readFileSync(file('LESSONS.md')), lessons);
});

const markers = {
  'JOURNAL.md': '*(No entries yet — this file accumulates as the project ships.)*',
  'LESSONS.md': '*(No lessons yet — this file accumulates as reusable knowledge emerges.)*',
};
for (const name of logs) for (const newline of ['\n', '\r\n']) {
  test(`${name} retains canonical ${JSON.stringify(newline)} preamble and excludes appended canaries`, () => {
    const prefix = [`# ${name}`, '', 'Generic instructions.', '', markers[name]].join(newline);
    const expected = prefix + newline;
    assert.equal(pristineProjectLog(name, prefix), expected);
    assert.equal(pristineProjectLog(name, expected + newline + '## 2026-01-01 | source-only canary' + newline), expected);
  });
}
for (const name of logs) {
  for (const [label, source] of [
    ['missing', '# Missing marker\n'],
    ['inline', '# Title\nExample: ' + markers[name] + '\n'],
    ['duplicate', markers[name] + '\n\n## History\n' + markers[name] + '\n'],
  ]) test(`${name} refuses ${label} seed boundary`, () => {
    assert.throws(() => pristineProjectLog(name, source), new RegExp(name + ': expected exactly one'));
  });
}
for (const invalidName of logs) test(`sync validates ${invalidName} before replacing an existing bundle`, t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'lp-seed-boundary-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const put = (relative, content) => {
    const file = path.join(dir, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
    return file;
  };
  cpSync(path.join(root, 'cli/scripts'), path.join(dir, 'cli/scripts'), { recursive: true });
  put('cli/package.json', '{"type":"module","version":"2.3.0"}');
  put('.agents/manifest.json', '{"manifest_version":1,"product_version":"2.3.0","kernel_version":"2.1.1"}');
  put('.agents/PROTOCOL_RULES.md', '> Version: 2.1.1 | Updated: 2026-09-15\n');
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'INDEX.md']) put(name, 'Generic pointer\n');
  const original = logs.map(name => {
    const content = name === invalidName ? '# Invalid boundary\nSOURCE CANARY\n' : markers[name] + '\nSOURCE CANARY\n';
    put('.agents/' + name, content);
    return Buffer.from(content);
  });
  const sentinel = put('cli/dist/templates/sentinel.txt', 'existing bundle untouched\n');
  const result = spawnSync(process.execPath, [path.join(dir, 'cli/scripts/sync-templates.mjs')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(invalidName + ': expected exactly one'));
  assert.equal(readFileSync(sentinel, 'utf8'), 'existing bundle untouched\n');
  assert.deepEqual(readdirSync(path.dirname(sentinel)), ['sentinel.txt']);
  for (const [i, name] of logs.entries()) assert.deepEqual(readFileSync(path.join(dir, '.agents', name)), original[i]);
});
