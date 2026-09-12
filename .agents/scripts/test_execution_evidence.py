"""Portable schema contract; no changes to the legacy Python handoff parser."""
import json
import re
from pathlib import Path
import pytest
from jsonschema import Draft202012Validator

AGENTS = Path(__file__).resolve().parents[1]

def validator():
    schema = json.loads((AGENTS / 'schemas/execution-evidence.schema.json').read_text())
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)

def test_portable_documented_examples():
    examples = [json.loads(s)['execution_evidence'] for s in re.findall(r'```json\n(.*?)\n```', (AGENTS / 'PROTOCOL_RULES.md').read_text(), re.S) if '"execution_evidence"' in s]
    assert len(examples) == 2
    for evidence in examples:
        validator().validate(evidence)
        assert {c['result'] for c in evidence['checks']} == {'passed', 'failed', 'not_run', 'blocked'}

@pytest.mark.parametrize('result', ['not_run', 'blocked'])
@pytest.mark.parametrize('reason', [None, '', ' \n\t'])
@pytest.mark.parametrize('surface', ['checks', 'browser_validation'])
def test_nonblank_reasons_on_every_status_surface(result, reason, surface):
    value = {'result': result}
    if reason is not None:
        value['reason'] = reason
    if surface == 'checks':
        evidence = {surface: [dict(value, command='test')]}
    else:
        evidence = {surface: dict(value, performed=False)}
    assert list(validator().iter_errors(evidence))

@pytest.mark.parametrize('result', ['passed', 'failed'])
def test_unperformed_browser_cannot_claim_execution(result):
    assert list(validator().iter_errors({'browser_validation': {'performed': False, 'result': result}}))

def test_empty_is_structurally_valid_only():
    validator().validate({})
    validator().validate({'checks': []})
