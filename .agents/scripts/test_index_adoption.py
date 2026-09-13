# SPDX-License-Identifier: Apache-2.0
"""Execute the source-adoption example without relying on shell-specific syntax."""
from pathlib import Path
import subprocess
import sys
import pytest

ROOT = Path(__file__).resolve().parents[2]


def adoption_code():
    text = (ROOT / 'README.md').read_text()
    assert '<!-- index-adoption-python -->' in text
    return text.split('<!-- index-adoption-python -->', 1)[1].split('```python', 1)[1].split('```', 1)[0]


@pytest.mark.parametrize('content', [None, b'', b'custom\r\nmap\r\n'])
def test_manual_create_and_repeat_preserve(tmp_path, content):
    code = adoption_code()
    source, dest = tmp_path / 'seed', tmp_path / 'INDEX.md'
    source.write_bytes(b'generic\n')
    if content is not None:
        dest.write_bytes(content)
    for _ in range(2):
        result = subprocess.run([sys.executable, '-c', code, str(source), str(dest)], capture_output=True)
        assert result.returncode == 0, result.stderr
        assert dest.read_bytes() == (b'generic\n' if content is None else content)


@pytest.mark.parametrize('side', ['source', 'destination'])
@pytest.mark.parametrize('kind', ['directory', 'live-link', 'dangling-link'])
def test_manual_refuses_unsupported_types(tmp_path, side, kind):
    code = adoption_code()
    source, dest, outside = tmp_path / 'seed', tmp_path / 'INDEX.md', tmp_path / 'outside'
    outside.write_bytes(b'untouched')
    source.write_bytes(b'generic')
    invalid = source if side == 'source' else dest
    invalid.unlink(missing_ok=True)
    if kind == 'directory':
        invalid.mkdir()
    else:
        invalid.symlink_to(outside if kind == 'live-link' else tmp_path / 'missing')
    result = subprocess.run([sys.executable, '-c', code, str(source), str(dest)], capture_output=True)
    assert result.returncode != 0
    assert outside.read_bytes() == b'untouched'
    if side == 'source':
        assert not dest.exists()


def test_unreleased_docs_and_ci_track_seed():
    readme = (ROOT / 'README.md').read_text()
    assert 'Knowledge map (unreleased)' in readme
    assert 'v2.1.5 does not contain INDEX.md' in readme
    cli = (ROOT / 'cli/README.md').read_text()
    assert 'exclusive creation' in cli and 'preflight' in cli
    assert (ROOT / '.github/workflows/cli-lifecycle.yml').read_text().count("- 'INDEX.md'") == 2
