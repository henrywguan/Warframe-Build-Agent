"""Runtime + static safeguards for external-only / low anti-cheat risk.

This cannot stop a malicious fork, and it cannot guarantee Easy Anti-Cheat
will never false-positive. It does enforce this application's contract:

1. Blocks known memory / injection / input-automation imports at runtime
2. Scans our source tree for process-memory and game-hook APIs before launch
3. Refuses elevated (admin/root) execution
4. Refuses to start if verification fails
"""

from __future__ import annotations

import ast
import importlib.abc
import os
import sys
from dataclasses import dataclass
from pathlib import Path

from .policy import (
    ANTICHEAT_RISK_REDUCTION,
    EXTERNAL_ONLY,
    FORBIDDEN_DEPENDENCY_NAMES,
    FORBIDDEN_IMPORT_ROOTS,
    FORBIDDEN_LOCAL_IMPORTS,
    FORBIDDEN_SOURCE_SNIPPETS,
    REFUSE_ELEVATED_PROCESS,
    assert_external_only,
)


class ExternalOnlyViolation(RuntimeError):
    """Raised when a memory-intrusion or high-risk capability is detected."""


@dataclass(frozen=True, slots=True)
class GuardFinding:
    kind: str
    detail: str


class _ForbiddenImportFinder(importlib.abc.MetaPathFinder):
    """Reject imports of known process-memory / injection / automation libraries."""

    def find_spec(self, fullname: str, path=None, target=None):  # noqa: ANN001
        root = fullname.split(".", 1)[0].lower()
        if root in FORBIDDEN_IMPORT_ROOTS:
            raise ExternalOnlyViolation(
                f"Blocked import of '{fullname}' — disallowed by the external-only / "
                "anti-cheat risk-reduction policy."
            )
        return None


_FINDER_INSTALLED = False


def install_import_blocker() -> None:
    """Install a sys.meta_path finder that blocks high-risk imports."""
    global _FINDER_INSTALLED
    assert_external_only()
    if _FINDER_INSTALLED:
        return
    sys.meta_path.insert(0, _ForbiddenImportFinder())
    _FINDER_INSTALLED = True


def package_root() -> Path:
    return Path(__file__).resolve().parent


def overlay_root() -> Path:
    return package_root().parent


def iter_app_python_files() -> list[Path]:
    root = package_root()
    return sorted(
        path
        for path in root.rglob("*.py")
        if "__pycache__" not in path.parts
    )


def _module_root(name: str) -> str:
    return name.split(".", 1)[0].lower()


def _is_policy_module(path: Path) -> bool:
    return path.name in {"external_guard.py", "policy.py"}


def scan_source_for_forbidden_apis(paths: list[Path] | None = None) -> list[GuardFinding]:
    findings: list[GuardFinding] = []
    files = paths if paths is not None else iter_app_python_files()

    for path in files:
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(overlay_root())

        if not _is_policy_module(path):
            for snippet in FORBIDDEN_SOURCE_SNIPPETS:
                if snippet in text:
                    findings.append(
                        GuardFinding(
                            "forbidden_source_snippet",
                            f"{rel}: contains {snippet!r}",
                        )
                    )

        try:
            tree = ast.parse(text, filename=str(path))
        except SyntaxError as exc:
            findings.append(
                GuardFinding("syntax_error", f"{rel}: cannot parse ({exc})")
            )
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root = _module_root(alias.name)
                    if root in FORBIDDEN_LOCAL_IMPORTS or root in FORBIDDEN_IMPORT_ROOTS:
                        if _is_policy_module(path):
                            continue
                        findings.append(
                            GuardFinding(
                                "forbidden_import",
                                f"{rel}: imports {alias.name}",
                            )
                        )
            elif isinstance(node, ast.ImportFrom):
                if not node.module:
                    continue
                root = _module_root(node.module)
                if root in FORBIDDEN_LOCAL_IMPORTS or root in FORBIDDEN_IMPORT_ROOTS:
                    if _is_policy_module(path):
                        continue
                    findings.append(
                        GuardFinding(
                            "forbidden_import",
                            f"{rel}: imports from {node.module}",
                        )
                    )
    return findings


def _requirement_package_names(text: str) -> set[str]:
    """Parse requirement package names, ignoring comments and version pins."""
    names: set[str] = set()
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if " #" in line:
            line = line.split(" #", 1)[0].strip()
        for separator in ("===", "==", ">=", "<=", "~=", "!=", ">", "<"):
            if separator in line:
                line = line.split(separator, 1)[0].strip()
                break
        line = line.replace("[", " ").split(" ", 1)[0].strip()
        if line:
            names.add(line.lower())
    return names


def scan_requirements() -> list[GuardFinding]:
    findings: list[GuardFinding] = []
    req = overlay_root() / "requirements.txt"
    if not req.exists():
        findings.append(GuardFinding("missing_requirements", str(req)))
        return findings
    packages = _requirement_package_names(req.read_text(encoding="utf-8"))
    for name in FORBIDDEN_DEPENDENCY_NAMES:
        banned = name.lower()
        if banned in packages or any(banned in pkg for pkg in packages):
            findings.append(
                GuardFinding(
                    "forbidden_dependency",
                    f"requirements.txt includes banned dependency {name!r}",
                )
            )
    return findings


def scan_loaded_modules() -> list[GuardFinding]:
    findings: list[GuardFinding] = []
    for loaded in list(sys.modules):
        root = _module_root(loaded)
        if root in FORBIDDEN_IMPORT_ROOTS:
            findings.append(
                GuardFinding(
                    "forbidden_module_loaded",
                    f"sys.modules contains banned module {loaded!r}",
                )
            )
    return findings


def process_is_elevated() -> bool:
    """Return True if running as root/admin (higher false-positive risk)."""
    geteuid = getattr(os, "geteuid", None)
    if callable(geteuid):
        return bool(geteuid() == 0)

    # Windows: use a tiny subprocess-free check via shell32 when available.
    # Kept inside this guard module only.
    if os.name == "nt":
        try:
            import ctypes  # noqa: PLC0415

            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False
    return False


def scan_privilege_level() -> list[GuardFinding]:
    if not REFUSE_ELEVATED_PROCESS:
        return []
    if process_is_elevated():
        return [
            GuardFinding(
                "elevated_process",
                "Overlay is running elevated (admin/root). "
                "Refuse this to reduce anti-cheat false-positive risk — "
                "run as a normal user.",
            )
        ]
    return []


def scan_anticheat_posture() -> list[GuardFinding]:
    """Confirm risk-reduction flags and capture/hotkey posture in source."""
    findings: list[GuardFinding] = []
    if not ANTICHEAT_RISK_REDUCTION:
        findings.append(
            GuardFinding(
                "anticheat_flag",
                "ANTICHEAT_RISK_REDUCTION must remain True",
            )
        )

    # Hotkeys must stay window-scoped (QShortcut), not global OS hooks.
    overlay_window = package_root() / "widgets" / "overlay_window.py"
    if overlay_window.exists():
        text = overlay_window.read_text(encoding="utf-8")
        if "QShortcut" not in text:
            findings.append(
                GuardFinding(
                    "hotkey_posture",
                    "overlay_window.py should use QShortcut (window-scoped hotkeys)",
                )
            )
        for banned in ("pynput", "SetWindowsHookEx", "keyboard.hook", "GlobalHotKey"):
            if banned in text:
                findings.append(
                    GuardFinding(
                        "hotkey_posture",
                        f"overlay_window.py contains high-risk hotkey API {banned!r}",
                    )
                )

    capture = package_root() / "capture.py"
    if capture.exists():
        text = capture.read_text(encoding="utf-8")
        if "mss" not in text:
            findings.append(
                GuardFinding(
                    "capture_posture",
                    "capture.py should use OS desktop capture (mss), not game hooks",
                )
            )
        for banned in ("dxcam", "bettercam", "ReadProcessMemory", "OpenProcess"):
            if banned in text:
                findings.append(
                    GuardFinding(
                        "capture_posture",
                        f"capture.py contains high-risk capture API {banned!r}",
                    )
                )
    return findings


def verify_external_only(*, install_blocker: bool = True) -> list[GuardFinding]:
    """Run all external-only / anti-cheat risk checks. Empty means pass."""
    assert_external_only()
    if not EXTERNAL_ONLY:
        return [GuardFinding("policy_flag", "EXTERNAL_ONLY is False")]

    if install_blocker:
        install_import_blocker()

    findings: list[GuardFinding] = []
    findings.extend(scan_requirements())
    findings.extend(scan_source_for_forbidden_apis())
    findings.extend(scan_loaded_modules())
    findings.extend(scan_privilege_level())
    findings.extend(scan_anticheat_posture())
    return findings


def enforce_external_only() -> None:
    """Install blockers and abort startup if verification fails."""
    findings = verify_external_only(install_blocker=True)
    if findings:
        details = "\n".join(f"- [{item.kind}] {item.detail}" for item in findings)
        raise ExternalOnlyViolation(
            "External-only / anti-cheat risk verification failed.\n"
            f"{details}"
        )


def format_verification_report(findings: list[GuardFinding]) -> str:
    if not findings:
        return "\n".join(
            [
                "External-only / anti-cheat risk verification: PASS",
                "",
                "Checks:",
                "- EXTERNAL_ONLY + ANTICHEAT_RISK_REDUCTION policy flags",
                "- requirements.txt has no memory/input-automation dependencies",
                "- overlay source has no process-memory / injection / global-hook APIs",
                "- no banned high-risk modules are loaded",
                "- runtime import blocker installed",
                "- process is not running elevated (admin/root)",
                "- capture uses OS desktop screenshots; hotkeys are window-scoped",
                "",
                "Allowed: separate overlay window, desktop region pixels, manual input.",
                "Forbidden: Warframe process memory, injection, game input automation.",
                "",
                "Disclaimer: this reduces false-positive risk but cannot guarantee",
                "Easy Anti-Cheat / Warframe will never flag a system. No third-party",
                "tool can promise that.",
            ]
        )
    lines = ["External-only / anti-cheat risk verification: FAIL", ""]
    for item in findings:
        lines.append(f"- [{item.kind}] {item.detail}")
    return "\n".join(lines)
