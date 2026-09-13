# SPDX-License-Identifier: Apache-2.0
"""Execute the portable bounded recipes extracted from the canonical kernel."""
import json
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[2]


def recipes():
    text = (ROOT / '.agents/PROTOCOL_RULES.md').read_text()
    assert '<!-- knowledge-search-python -->' in text
    code = text.split('<!-- knowledge-search-python -->', 1)[1].split('```python', 1)[1].split('```', 1)[0]
    scope = {}
    exec(compile(code, 'P-Access recipe', 'exec'), scope)
    return scope


def test_literal_old_archive_many_zero_and_continuation(tmp_path):
    api = recipes()
    old = tmp_path / 'JOURNAL.md'
    old.write_text('## Old\nneedle[.*] old\n' + 'later unrelated\n' * 100)
    archive = tmp_path / 'archive'
    archive.mkdir()
    saved = archive / 'JOURNAL-2020.md'
    saved.write_text('## Archived\n' + 'needle[.*]\n' * 45)
    paths = [old, saved]
    hits = []
    offset = 0
    while True:
        page = api['search_page'](paths, 'needle[.*]', offset, 7)
        assert len(page['hits']) <= 7
        hits.extend(page['hits'])
        if page['next'] is None:
            break
        offset = page['next']
    assert len(hits) == 46
    assert hits[0]['line'] == 2
    assert api['search_page'](paths, 'absent')['hits'] == []
    assert api['search_page'](paths, 'needle.*')['hits'] == []
    with pytest.raises(FileNotFoundError):
        api['search_page']([tmp_path / 'missing'], 'x')


@pytest.mark.parametrize('suffix,content,line,expected', [
    ('.md', '## Older\nneedle\n' + 'multiline detail\n' * 100 + '## Next\nnot relevant\n', 2, '## Older\nneedle\n' + 'multiline detail\n' * 100),
    ('.jsonl', json.dumps({'decision': 'needle', 'rationale': 'long ' * 500}) + '\n{}\n', 1, json.dumps({'decision': 'needle', 'rationale': 'long ' * 500}) + '\n'),
], ids=['markdown', 'jsonl'])
def test_complete_entry_retrieval_in_bounded_chunks(tmp_path, suffix, content, line, expected):
    api = recipes()
    source = tmp_path / ('history' + suffix)
    source.write_text(content)
    assert api['search_page']([source], 'needle')['hits'][0]['line'] == line
    offset = 0
    chunks = []
    while True:
        page = api['entry_page'](source, line, offset, 80)
        assert len(page['text']) <= 80
        chunks.append(page['text'])
        if page['next'] is None:
            break
        offset = page['next']
    assert ''.join(chunks) == expected


def test_long_hit_preview_is_explicitly_clipped(tmp_path):
    api = recipes()
    source = tmp_path / 'decisions.jsonl'
    source.write_text('x' * 1000 + '\n')
    hit = api['search_page']([source], 'x')['hits'][0]
    assert len(hit['preview']) <= 200 and hit['clipped']
