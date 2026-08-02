"""Runtime + static safeguards against Warframe process memory access.

This cannot stop a malicious fork of the repo, but it does enforce the
external-only contract for *this* application:

1. Blocks known memory-tooling imports at runtime
2. Scans our source tree for process-memory APIs before UI launch
3. Refuses to start if verification fails
"""

from __future__ import annotations

import ast
import importlib.abc
import sys
from dataclasses import dataclass
from pathlib import Path

from .policy import (
    EXTERNAL_ONLY,
    FORBIDDEN_DEPENDENCY_NAMES,
    FORBIDDEN_IMPORT_ROOTS,
    FORBIDDEN_LOCAL_IMPORTS,
    FORBIDDEN_SOURCE_SNIPPETS,
    assert_external_only,
)


class ExternalOnlyViolation(RuntimeError):
    """Raised when a memory-intrusion capability is detected."""


@dataclass(frozen=True, slots=True)
class GuardFinding:
    kind: str
    detail: str


class _ForbiddenImportFinder(importlib.abc.MetaPathFinder):
    """Reject imports of known process-memory / injection libraries."""

    def find_spec(self, fullname: str, path=None, target=None):  # noqa: ANN001
        root = fullname.split(".", 1)[0].lower()
        if root in FORBIDDEN_IMPORT_ROOTS:
            raise ExternalOnlyViolation(
                f"Blocked import of '{fullname}' — Warframe memory tooling is forbidden "
                "(external-only overlay policy)."
            )
        return None


_FINDER_INSTALLED = False


def install_import_blocker() -> None:
    """Install a sys.meta_path finder that blocks memory-tooling imports."""
    global _FINDER_INSTALLED
    assert_external_only()
    if _FINDER_INSTALLED:
        return
    # Insert at the front so we fail before any forbidden package loads.
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


def scan_source_for_forbidden_apis(paths: list[Path] | None = None) -> list[GuardFinding]:
    findings: list[GuardFinding] = []
    files = paths if paths is not None else iter_app_python_files()

    for path in files:
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(overlay_root())

        # Allow this guard module to mention banned APIs in its own blocklists.
        if path.name in {"external_guard.py", "policy.py"}:
            # Still parse imports so we don't accidentally import ctypes/etc.
            pass
        else:
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
                        # policy/external_guard may reference names as data only.
                        if path.name in {"external_guard.py", "policy.py"}:
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
                    if path.name in {"external_guard.py", "policy.py"}:
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


def verify_external_only(*, install_blocker: bool = True) -> list[GuardFinding]:
    """Run all external-only checks. Returns findings (empty means pass)."""
    assert_external_only()
    if not EXTERNAL_ONLY:
        return [GuardFinding("policy_flag", "EXTERNAL_ONLY is False")]

    if install_blocker:
        install_import_blocker()

    findings: list[GuardFinding] = []
    findings.extend(scan_requirements())
    findings.extend(scan_source_for_forbidden_apis())
    findings.extend(scan_loaded_modules())
    return findings


def enforce_external_only() -> None:
    """Install blockers and abort startup if verification fails."""
    findings = verify_external_only(install_blocker=True)
    if findings:
        details = "\n".join(f"- [{item.kind}] {item.detail}" for item in findings)
        raise ExternalOnlyViolation(
            "External-only verification failed. "
            "This overlay must never read Warframe process memory.\n"
            f"{details}"
        )


def format_verification_report(findings: list[GuardFinding]) -> str:
    if not findings:
        return "\n".join(
            [
                "External-only verification: PASS",
                "",
                "Checks:",
                "- EXTERNAL_ONLY policy flag",
                "- requirements.txt has no memory-tooling dependencies",
                "- overlay source has no process-memory / injection APIs",
                "- no banned memory modules are loaded",
                "- runtime import blocker installed for known memory tooling",
                "",
                "Allowed inputs remain: screen pixels, manual UI input, local files, public APIs.",
                "Warframe process memory read/write is forbidden.",
            ]
        )
    lines = ["External-only verification: FAIL", ""]
    for item in findings:
        lines.append(f"- [{item.kind}] {item.detail}")
    return "\n".join(lines)
