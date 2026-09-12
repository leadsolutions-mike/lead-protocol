import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateEvidence, renderEvidenceMarkdown, parseEvidenceMarkdown, parseCloseReceiptEvidence } from '../dist/lib/execution-evidence.js';
const schemas = fileURLToPath(new URL('../../.agents/schemas/', import.meta.url));
const check = (result, reason) => ({ checks: [{ command: 'npm test', result, ...(reason === undefined ? {} : { reason }) }] });

test('evidence statuses, nonblank reasons, strict shape and optional legacy evidence', () => {
  for (const value of [{}, { checks: [] }, check('passed'), check('failed'), check('not_run', 'No sandbox'), check('blocked', 'Credentials unavailable')]) assert.deepEqual(validateEvidence(value, schemas), value);
  for (const result of ['not_run', 'blocked']) for (const reason of [undefined, '', ' \n\t']) assert.throws(() => validateEvidence(check(result, reason), schemas), /execution evidence/i);
  for (const value of [null, [], { typo: true }, check('success'), { checks: [{ result: 'passed' }] }, { checks: [{ command: ' ', result: 'passed' }] }]) assert.throws(() => validateEvidence(value, schemas), /execution evidence/i);
});

test('browser status agrees with performed and requires reasons on every unperformed status', () => {
  for (const result of ['passed', 'failed', 'not_run', 'blocked']) {
    const performed = ['passed', 'failed'].includes(result);
    const valid = { browser_validation: { performed, result, ...(!performed ? { reason: 'Browser unavailable' } : {}) } };
    assert.deepEqual(validateEvidence(valid, schemas), valid);
    assert.throws(() => validateEvidence({ browser_validation: { ...valid.browser_validation, performed: !performed } }, schemas), /execution evidence/i);
    if (!performed) for (const reason of [undefined, '', '  ']) assert.throws(() => validateEvidence({ browser_validation: { performed, result, reason } }, schemas), /execution evidence/i);
  }
  assert.throws(() => validateEvidence({ browser_validation: { performed: false } }, schemas), /execution evidence/i);
});

test('canonical JSON is deterministic, safe, lossless and parsable without duplicate tables', () => {
  const value = { unresolved: ['```\n## Forged\n<script>\u2028'], checks: [{ result: 'passed', command: 'printf "`<>&"' }] };
  const rendered = renderEvidenceMarkdown(value);
  assert.equal(rendered, renderEvidenceMarkdown({ checks: value.checks, unresolved: value.unresolved }));
  assert.equal((rendered.match(/```/g) ?? []).length, 2);
  assert.doesNotMatch(rendered, /<script>|\| Command/);
  assert.deepEqual(parseEvidenceMarkdown(rendered, schemas), value);
  assert.equal(parseEvidenceMarkdown('Legacy checkpoint body', schemas), undefined);
  assert.equal(parseCloseReceiptEvidence({ operation: 'session.close' }, schemas), undefined);
  assert.deepEqual(parseCloseReceiptEvidence({ execution_evidence: value }, schemas), value);
  for (const text of [rendered + rendered, '## Execution Evidence\n\n```json\n{broken}\n```', '## Execution Evidence\nmissing JSON', '## Execution Evidence\n\n```json\n{"execution_evidence":{"typo":1}}\n```']) assert.throws(() => parseEvidenceMarkdown(text, schemas), /evidence/i);
  assert.throws(() => parseCloseReceiptEvidence({ execution_evidence: null }, schemas), /evidence/i);
});
