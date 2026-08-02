from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtWidgets import QApplication

from .widgets.overlay_window import OverlayWindow


def run(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv
    app = QApplication(args)
    app.setApplicationName("Warframe Build Agent Overlay")
    app.setOrganizationName("WarframeBuildAgent")

    # Ensure local package imports work when launched via `python -m`.
    root = Path(__file__).resolve().parent.parent
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    window = OverlayWindow()
    window.show()
    return app.exec()


def main() -> None:
    raise SystemExit(run())
