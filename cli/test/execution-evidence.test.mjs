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

for (const [lineEnding, newline] of [['LF', '\n'], ['CRLF', '\r\n']]) {
  test(`illustrative closeout and checkpoint examples cover all statuses and reproducible references (${lineEnding})`, () => {
    const rules = readFileSync(new URL('../../.agents/PROTOCOL_RULES.md', import.meta.url), 'utf8').replace(/\r?\n/g, newline);
    const examples = [...rules.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)].map(m => JSON.parse(m[1])).filter(v => v.execution_evidence);
    assert.equal(examples.length, 2, 'one illustrative closeout and one checkpoint example');
    for (const { execution_evidence: value } of examples) {
      validateEvidence(value, schemas);
      assert.deepEqual(new Set(value.checks.map(c => c.result)), new Set(['passed', 'failed', 'not_run', 'blocked']));
      for (const field of ['branch', 'commit']) assert.ok(value.git[field]);
      for (const field of ['runtime', 'cwd', 'ci_run', 'package_manager']) assert.ok(value.environment[field]);
      assert.ok(value.checks.some(c => c.artifact));
      assert.ok(value.browser_validation.evidence);
    }
    assert.match(rules, /optional globally/i);
    assert.match(rules, /must not be marked complete solely because files were changed/i);
  });
}

for (const newline of ['\n', '\r\n']) {
  for (const fence of ['```', '~~~', '````', '~~~~~']) {
    test(`quoted evidence stays illustrative (${JSON.stringify(fence)}, ${JSON.stringify(newline)})`, () => {
      const fake = renderEvidenceMarkdown({ unresolved: ['illustrative only'] });
      // Shorter/mixed inner fences and a non-closing suffix must not close the outer fence.
      const quoted = [`   ${fence}markdown`, '## Execution Evidence', 'placeholder', '```json', '{"execution_evidence":{}}', '```', `${fence} trailing`, fake, ` ${fence}${fence[0]}\t`].join('\n').replace(/\n/g, newline);
      // With a three-backtick outer fence, use a plain heading example instead of same-length nesting.
      const body = fence === '```' ? '```markdown\n## Execution Evidence\nplaceholder\n```'.replace(/\n/g, newline) : quoted;
      assert.equal(parseEvidenceMarkdown(body, '/missing-schema'), undefined);
      const real = { checks: [{ command: 'actual', result: 'failed' }] };
      const canonical = renderEvidenceMarkdown(real).replace(/\n/g, newline);
      assert.deepEqual(parseEvidenceMarkdown(body + newline + canonical, schemas), real);
      assert.deepEqual(parseEvidenceMarkdown(canonical + newline + body, schemas), real);
      assert.throws(() => parseEvidenceMarkdown(body + newline + '## Execution Evidence\nmissing JSON', schemas), /Malformed execution evidence/);
      assert.throws(() => parseEvidenceMarkdown(body + newline + canonical + canonical, schemas), /Duplicate execution evidence/);
    });
  }
}

test('unclosed fences hide examples; invalid backtick opener does not hide a real malformed section', () => {
  for (const fence of ['````', '~~~~']) {
    assert.equal(parseEvidenceMarkdown(`${fence}markdown\n\`\`\`\n## Execution Evidence\nplaceholder`, '/missing-schema'), undefined);
  }
  assert.throws(() => parseEvidenceMarkdown('```invalid`info\n## Execution Evidence\nplaceholder', schemas), /Malformed execution evidence/);
});

for (const fence of ['````', '~~~~']) {
  test(`a single nested canonical example is never extracted as evidence (${fence})`, () => {
    const body = `${fence}markdown\n${renderEvidenceMarkdown({ unresolved: ['fake evidence'] })}${fence}\n`;
    assert.equal(parseEvidenceMarkdown(body, schemas), undefined);
  });
}
