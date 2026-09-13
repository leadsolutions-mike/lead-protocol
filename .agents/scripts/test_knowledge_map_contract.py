# SPDX-License-Identifier: Apache-2.0
"""Issue18 navigation contracts; deterministic prose/seed checks, not LLM compliance."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def test_seed_is_generic_pointer_only_with_real_targets():
    text = (ROOT / 'INDEX.md').read_text()
    rows = [line.split('|')[1:-1] for line in text.splitlines() if line.startswith('| ')][1:]
    assert rows
    for topic, target, locator in rows:
        target = target.strip().strip('`')
        assert (ROOT / target).is_file(), target
        assert locator.strip().strip('`') in (ROOT / target).read_text(), locator
    assert 'project-owned' in text
    assert 'Optional folder navigation' in text
    assert '§J6' in text and '§P6' in text and '§P7' in text
    for row in rows:
        assert not re.search(r'local/|/home/|issue.?18|Mike|Hermes|checkpoint', '|'.join(row), re.I)


def test_discovery_is_on_demand_with_independent_fallback():
    for name in ['AGENTS.md', 'CLAUDE.md', '.agents/CORE_RULES.md']:
        text = (ROOT / name).read_text()
        assert 'Before answering a project question' in text
        assert 'INDEX.md' in text and '§J6' in text and '§P-Access' in text
        assert 'on demand' in text
    kernel = (ROOT / '.agents/PROTOCOL_RULES.md').read_text()
    access = kernel.split('## §P-Access', 1)[1].split('## §P-Threat', 1)[0]
    for fragment in ['INDEX.md', 'missing or stale', 'not proof of absence', 'archived', 'literal', 'continuation', 'inaccessible', 'canonical sources']:
        assert fragment in access


def test_maintenance_is_in_quality_and_close_without_schema_growth():
    kernel = (ROOT / '.agents/PROTOCOL_RULES.md').read_text()
    for section in [kernel.split('### Session close ritual', 1)[1].split('### Branch ordering', 1)[0], kernel.split('## §P4', 1)[1].split('## §P5', 1)[0], (ROOT / '.agents/PROJECT_RULES.md').read_text().split('## §J5', 1)[1].split('## §J6', 1)[0]]:
        assert 'same session' in section and 'INDEX.md' in section
    assert 'section/anchor' in kernel


def test_unreleased_kernel_description_matches_manifest():
    import json
    manifest = json.loads((ROOT / '.agents/manifest.json').read_text())
    unreleased = (ROOT / 'CHANGELOG.md').read_text().split('## [Unreleased]', 1)[1].split('\n## [', 1)[0]
    assert f"Kernel {manifest['kernel_version']}" in unreleased
