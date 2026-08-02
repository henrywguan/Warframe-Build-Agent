import importlib
import sys
import unittest
from pathlib import Path

from wf_overlay.external_guard import (
    ExternalOnlyViolation,
    enforce_external_only,
    format_verification_report,
    install_import_blocker,
    scan_source_for_forbidden_apis,
    verify_external_only,
)
from wf_overlay.policy import EXTERNAL_ONLY, FORBIDDEN_DEPENDENCY_NAMES, assert_external_only


ROOT = Path(__file__).resolve().parents[1]


class ExternalOnlyPolicyTests(unittest.TestCase):
    def test_flag_is_enabled(self) -> None:
        self.assertTrue(EXTERNAL_ONLY)
        assert_external_only()

    def test_requirements_exclude_memory_tooling(self) -> None:
        from wf_overlay.external_guard import _requirement_package_names

        packages = _requirement_package_names(
            (ROOT / "requirements.txt").read_text(encoding="utf-8")
        )
        for name in FORBIDDEN_DEPENDENCY_NAMES:
            banned = name.lower()
            self.assertNotIn(banned, packages)
            self.assertFalse(any(banned in pkg for pkg in packages))

    def test_verify_external_only_passes_on_clean_tree(self) -> None:
        findings = verify_external_only(install_blocker=True)
        self.assertEqual(findings, [], format_verification_report(findings))
        enforce_external_only()

    def test_import_blocker_rejects_pymem(self) -> None:
        install_import_blocker()
        with self.assertRaises(ExternalOnlyViolation):
            importlib.import_module("pymem")

    def test_import_blocker_rejects_frida(self) -> None:
        install_import_blocker()
        with self.assertRaises(ExternalOnlyViolation):
            importlib.import_module("frida")

    def test_source_scan_detects_injected_memory_api(self) -> None:
        fake = ROOT / "wf_overlay" / "_fake_memory_probe.py"
        self.addCleanup(lambda: fake.exists() and fake.unlink())
        fake.write_text(
            "def bad():\n    return 'ReadProcessMemory'\n",
            encoding="utf-8",
        )
        findings = scan_source_for_forbidden_apis([fake])
        self.assertTrue(any("ReadProcessMemory" in item.detail for item in findings))

    def test_source_tree_has_no_memory_intrusion_imports(self) -> None:
        findings = [
            item
            for item in scan_source_for_forbidden_apis()
            if item.kind in {"forbidden_import", "forbidden_source_snippet"}
        ]
        self.assertEqual(findings, [], format_verification_report(findings))

    def test_cli_verify_flag(self) -> None:
        from wf_overlay.app import run

        code = run(["wf_overlay", "--verify-external"])
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
