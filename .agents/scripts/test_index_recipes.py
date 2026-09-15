# SPDX-License-Identifier: Apache-2.0
"""Execute the portable bounded recipes extracted from the canonical kernel."""
import json
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[2]


def recipes():
    text = (ROOT / '.agents/PROTOCOL_RULES.md').read_text(encoding="utf-8")
    assert '<!-- knowledge-search-python -->' in text
    code = text.split('<!-- knowledge-search-python -->', 1)[1].split('```python', 1)[1].split('```', 1)[0]
    scope = {}
    exec(compile(code, 'P-Access recipe', 'exec'), scope)
    return scope


def test_literal_old_archive_many_zero_and_continuation(tmp_path):
    api = recipes()
    old = tmp_path / 'JOURNAL.md'
    old.write_text('## Old\nneedle[.*] old\n' + 'later unrelated\n' * 100, encoding="utf-8")
    archive = tmp_path / 'archive'
    archive.mkdir()
    saved = archive / 'JOURNAL-2020.md'
    saved.write_text('## Archived\n' + 'needle[.*]\n' * 45, encoding="utf-8")
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
    source.write_text(content, encoding="utf-8")
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
    source.write_text('x' * 1000 + '\n', encoding="utf-8")
    hit = api['search_page']([source], 'x')['hits'][0]
    assert len(hit['preview']) <= 200 and hit['clipped']


def collect_entry(api, source, line, limit=80):
    chunks = []
    offset = 0
    for _ in range(1000):
        page = api['entry_page'](source, line, offset, limit)
        assert len(page['text']) <= limit
        chunks.append(page['text'])
        if page['next'] is None:
            return ''.join(chunks)
        assert page['next'] == offset + limit
        offset = page['next']
    pytest.fail('entry continuation did not terminate')


@pytest.mark.parametrize('marker', ['`', '~'])
@pytest.mark.parametrize('length', [3, 4, 7])
@pytest.mark.parametrize('indent', [0, 1, 3])
def test_fenced_headings_preserve_complete_entry(tmp_path, marker, length, indent):
    api = recipes()
    source = tmp_path / 'history.md'
    opening = ' ' * indent + marker * length + 'markdown\n'
    closing = ' ' * (3 - indent) + marker * (length + 1) + ' \t\n'
    expected = ('## Actual entry\nneedle before fence\n' + opening
                + '## needle illustrative heading\n'
                + 'detail\n' * 500 + closing + 'needle final rationale\n')
    previous = '## Previous\nold\n'
    following = '## Next entry\nnext rationale\n'
    source.write_text(previous + expected + following, encoding="utf-8")
    hits = api['search_page']([source], 'needle')['hits']
    assert len(hits) == 3
    for hit in hits:
        assert collect_entry(api, source, hit['line']) == expected
    assert collect_entry(api, source, 3) == expected  # real heading hit
    assert collect_entry(api, source, 1) == previous
    assert collect_entry(api, source, len((previous + expected).splitlines()) + 1) == following


@pytest.mark.parametrize('marker', ['`', '~'])
@pytest.mark.parametrize('false_close', ['short', 'mismatch', 'text', 'indented'])
def test_only_valid_fence_closes(tmp_path, marker, false_close):
    api = recipes()
    source = tmp_path / 'history.md'
    invalid = {'short': marker * 3, 'mismatch': ('~' if marker == '`' else '`') * 4,
               'text': marker * 4 + ' trailing', 'indented': '    ' + marker * 4}[false_close]
    expected = ('## Entry\n' + marker * 4 + '\n' + invalid
                + '\n## needle still fenced\n' + marker * 4 + '\nfinal rationale\n')
    source.write_text(expected + '## Next\nother\n', encoding="utf-8")
    assert collect_entry(api, source, 4) == expected


@pytest.mark.parametrize('marker', ['`', '~'])
@pytest.mark.parametrize('line', [1, 3, 4])
def test_unterminated_fence_refuses_instead_of_signaling_complete(tmp_path, marker, line):
    source = tmp_path / 'history.md'
    source.write_text('## Entry\n' + marker * 4 + '\n## fenced heading\nfinal rationale\n', encoding="utf-8")
    with pytest.raises(ValueError, match='Unterminated fence'):
        recipes()['entry_page'](source, line)


@pytest.mark.parametrize('non_fence', ['``', '~~', '    ```', '    ~~~', '```bad`info'])
def test_non_openers_do_not_hide_real_entry_boundary(tmp_path, non_fence):
    source = tmp_path / 'history.md'
    first = '## Entry\n' + non_fence + '\nbody\n'
    source.write_text(first + '## Next\nnext\n', encoding="utf-8")
    assert collect_entry(recipes(), source, 1) == first


def test_documented_literal_heading_boundary_and_preamble(tmp_path):
    source = tmp_path / 'history.md'
    preamble = 'preamble\n'
    entry = '## Entry\n### Nested\n  ## indented\n##\n##\ttab\ntext\n'
    source.write_text(preamble + entry + '## Next\nnext\n', encoding="utf-8")
    assert collect_entry(recipes(), source, 1) == preamble
    assert collect_entry(recipes(), source, 3) == entry


@pytest.mark.parametrize('separator', ['\u2028', '\u2029', '\u0085'], ids=['line-separator', 'paragraph-separator', 'next-line'])
@pytest.mark.parametrize('newline', ['\n', '\r\n'], ids=['lf', 'crlf'])
def test_jsonl_unicode_separators_preserve_physical_records(tmp_path, separator, newline):
    api = recipes()
    source = tmp_path / 'decisions.jsonl'
    records = [
        json.dumps({'decision': 'prefix' + separator + 'needle suffix'}, ensure_ascii=False),
        json.dumps({'decision': 'needle subsequent record'}, ensure_ascii=False),
    ]
    source.write_bytes((newline.join(records) + newline).encode('utf-8'))
    first = api['search_page']([source], 'needle', limit=1)
    assert [hit['line'] for hit in first['hits']] == [1]
    assert first['next'] == 1
    second = api['search_page']([source], 'needle', offset=first['next'], limit=1)
    assert [hit['line'] for hit in second['hits']] == [2]
    assert second['next'] is None
    for hit, expected in zip(first['hits'] + second['hits'], records):
        actual = collect_entry(api, source, hit['line'], limit=7)
        assert actual == expected + '\n'
        assert json.loads(actual) == json.loads(expected)
