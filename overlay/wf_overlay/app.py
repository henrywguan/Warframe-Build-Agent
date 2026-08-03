from __future__ import annotations

import sys
from pathlib import Path

from .external_guard import enforce_external_only, format_verification_report, verify_external_only


def run(argv: list[str] | None = None) -> int:
    args = list(argv if argv is not None else sys.argv)

    if any(arg in {"--verify-external", "--verify", "verify"} for arg in args[1:]):
        findings = verify_external_only(install_blocker=True)
        print(format_verification_report(findings))
        return 1 if findings else 0

    # Fail closed: do not open the UI if external-only checks fail.
    enforce_external_only()

    from PySide6.QtWidgets import QApplication

    from .widgets.overlay_window import OverlayWindow

    app = QApplication(args)
    app.setApplicationName("Warframe Build Agent Overlay")
    app.setOrganizationName("WarframeBuildAgent")

    root = Path(__file__).resolve().parent.parent
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    window = OverlayWindow()
    window.show()
    return app.exec()


def main() -> None:
    raise SystemExit(run())
