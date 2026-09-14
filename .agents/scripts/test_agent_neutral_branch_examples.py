# SPDX-License-Identifier: Apache-2.0
"""git-substrate module: vendor-neutral branching and concurrent isolation."""

from pathlib import Path
import re
import subprocess
import tempfile

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
GENERIC_BRANCH_RULES = (
    REPOSITORY_ROOT / ".agents" / "PROJECT_RULES.md",
    REPOSITORY_ROOT / ".agents" / "modules" / "git-substrate.md",
)
VENDOR_SPECIFIC_DEFAULTS = ("`claude/*`", "`claude/<description>`")
SPDX_LICENSE_IDENTIFIER = "# SPDX-License-Identifier: Apache-2.0"


@pytest.mark.parametrize("rules_path", GENERIC_BRANCH_RULES)
def test_generic_branch_examples_use_mapped_agent_slug(rules_path: Path) -> None:
    content = rules_path.read_text(encoding="utf-8")

    assert "`<agent-slug>/<description>`" in content
    for vendor_default in VENDOR_SPECIFIC_DEFAULTS:
        assert vendor_default not in content


def test_framework_python_scripts_declare_apache_license() -> None:
    scripts_dir = REPOSITORY_ROOT / ".agents" / "scripts"

    for script_path in sorted(scripts_dir.glob("*.py")):
        leading_lines = script_path.read_text(encoding="utf-8").splitlines()[:2]
        assert SPDX_LICENSE_IDENTIFIER in leading_lines, script_path.name


@pytest.mark.parametrize("contract", [
    r"Git repository.*explicit common.*<integration-base>",
    r"concurrent writer.*<agent-slug>.*\.agents/AGENTS_MAP\.md.*\.agents/PROJECT_RULES\.md.*§J8",
    r"distinct branch.*distinct working directory.*worktree.*clone",
    r"different branches.*shared checkout.*do not isolate.*filesystem edits",
    r"default branch.*integration-only.*only when.*policy.*protection.*PR.*exceptions",
    r"one writer.*serial handoffs.*non-Git projects.*no mandatory",
    r"planning.*checkpoint.*review.*implementation.*implementer.*reviewer.*same branch/worktree",
    r"serial.*prior writer pauses.*reviewed state remains stable.*generated files.*test runs.*coordinated",
    r"Never require.*per agent.*tool.*checkpoint.*task.*identities differ",
    r"optional.*detached.*fixed-commit.*review worktree.*implementation continues concurrently",
    r"not locks.*do not make acquisition atomic.*no global presence.*control plane",
    r"active_sessions\.md.*different branches.*not automatically.*synchronized",
    r"#5.*append-only.*merge.*integrity.*#19.*file locks.*neither",
    r"share Git objects/refs.*isolate uncommitted directory state",
    r"external files.*services.*ports.*credentials.*storage.*shared",
    r"cleanup.*status.*no.*hard reset.*broad clean.*forced removal",
])
def test_concurrent_isolation_contract(contract: str) -> None:
    content = GENERIC_BRANCH_RULES[1].read_text(encoding="utf-8")
    section = re.search(r"^## §M-git-7\b(.*?)(?=^## |\Z)", content, re.M | re.S)
    assert section is not None, "Missing concurrent worktree guidance (§M-git-7)"
    prose = " ".join(section.group(1).replace("`", "").replace("**", "").split())
    assert re.search(contract, prose, re.I), f"Missing semantic contract: {contract}"


def test_concurrent_examples_use_two_directories_and_common_base() -> None:
    content = GENERIC_BRANCH_RULES[1].read_text(encoding="utf-8")
    assert re.search(r"^> Version: 1\.3\.0 \| Updated: 2026-09-12\b", content, re.M)
    for writer in ("a", "b"):
        assert f'git worktree add -b "<branch-{writer}>" "<directory-{writer}>" "<integration-base>"' in content
        assert f'git clone "<repository-url>" "<clone-{writer}>"' in content
        assert f'git -C "<clone-{writer}>" switch -c "<branch-{writer}>" "<integration-base>"' in content
    assert "git worktree remove --force" not in content
    assert "git reset --hard" not in content
    assert "git clean -" not in content


def test_worktrees_isolate_uncommitted_files() -> None:
    # Only this temporary fixture is modified or removed; never the source repo.
    with tempfile.TemporaryDirectory(prefix="lp-worktrees-") as temporary:
        root = Path(temporary)
        repository = root / "repository"
        repository.mkdir()

        def git(directory: Path, *args: str) -> str:
            return subprocess.run(
                ["git", "-C", str(directory), *args], check=True,
                capture_output=True, text=True,
            ).stdout.strip()

        git(repository, "init")
        (repository / "common.txt").write_text("common\n", encoding="utf-8")
        git(repository, "add", "common.txt")
        git(repository, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
            "-c", "commit.gpgsign=false", "commit", "-m", "Common base")
        base = git(repository, "rev-parse", "HEAD")
        directories = [root / "writer-a", root / "writer-b"]
        for directory in directories:
            git(repository, "worktree", "add", "-b", directory.name, str(directory), base)
            assert git(directory, "rev-parse", "HEAD") == base
            assert git(directory, "branch", "--show-current") == directory.name
        for directory in directories:
            (directory / f"{directory.name}.txt").write_text("uncommitted\n", encoding="utf-8")
            (directory / "common.txt").write_text(directory.name, encoding="utf-8")
        for directory, other in (directories, directories[::-1]):
            assert (directory / "common.txt").read_text(encoding="utf-8") == directory.name
            assert not (directory / f"{other.name}.txt").exists()
            assert git(directory, "status", "--porcelain")
            # Restore only the two known fixture files after inspecting status.
            (directory / f"{directory.name}.txt").unlink()
            (directory / "common.txt").write_text("common\n", encoding="utf-8")
            assert git(directory, "status", "--porcelain") == ""
            git(repository, "worktree", "remove", str(directory))
