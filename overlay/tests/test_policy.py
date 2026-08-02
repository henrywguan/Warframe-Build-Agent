import unittest
from pathlib import Path

from wf_overlay.policy import (
    EXTERNAL_ONLY,
    FORBIDDEN_DEPENDENCY_NAMES,
    assert_external_only,
)


ROOT = Path(__file__).resolve().parents[1]


class ExternalOnlyPolicyTests(unittest.TestCase):
    def test_flag_is_enabled(self) -> None:
        self.assertTrue(EXTERNAL_ONLY)
        assert_external_only()

    def test_requirements_exclude_memory_tooling(self) -> None:
        req = (ROOT / "requirements.txt").read_text(encoding="utf-8").lower()
        for name in FORBIDDEN_DEPENDENCY_NAMES:
            self.assertNotIn(name, req)

    def test_source_tree_has_no_memory_intrusion_imports(self) -> None:
        banned_snippets = (
            "import pymem",
            "from pymem",
            "import frida",
            "from frida",
            "ReadProcessMemory",
            "WriteProcessMemory",
            "OpenProcess(",
        )
        for path in (ROOT / "wf_overlay").rglob("*.py"):
            text = path.read_text(encoding="utf-8")
            for snippet in banned_snippets:
                self.assertNotIn(
                    snippet,
                    text,
                    msg=f"{path} must not contain {snippet!r}",
                )


if __name__ == "__main__":
    unittest.main()
