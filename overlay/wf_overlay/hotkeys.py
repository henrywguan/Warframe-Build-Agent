"""OS-registered global hotkeys for the overlay.

Uses Windows RegisterHotKey (standard app hotkeys). This is intentionally
NOT a low-level keyboard hook and does NOT send input into Warframe.

On non-Windows platforms, global registration is unavailable; the overlay
still exposes clickable buttons and window-scoped QShortcut fallbacks.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass

from PySide6.QtCore import QAbstractNativeEventFilter, QObject, Signal


@dataclass(frozen=True, slots=True)
class HotkeyBinding:
    action_id: str
    label: str
    # Windows virtual-key code (e.g. 0x41 for "A")
    vk: int
    chord: str


# Ctrl+Shift + key — same chords shown on the buttons.
HOTKEY_BINDINGS: tuple[HotkeyBinding, ...] = (
    HotkeyBinding("refresh", "Refresh actions", 0x41, "Ctrl+Shift+A"),  # A
    HotkeyBinding("set_region", "Set region", 0x52, "Ctrl+Shift+R"),  # R
    HotkeyBinding("capture", "Capture", 0x43, "Ctrl+Shift+C"),  # C
    HotkeyBinding("toggle", "Show / hide", 0x48, "Ctrl+Shift+H"),  # H
)


class GlobalHotkeyManager(QObject):
    """Register/unregister OS global hotkeys and emit action ids."""

    triggered = Signal(str)
    statusChanged = Signal(str)

    def __init__(self, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._enabled = False
        self._backend: _WindowsHotkeyBackend | None = None

    @property
    def supported(self) -> bool:
        return sys.platform == "win32"

    @property
    def enabled(self) -> bool:
        return self._enabled

    def set_enabled(self, enabled: bool) -> None:
        if enabled == self._enabled:
            return
        if enabled:
            self.start()
        else:
            self.stop()

    def start(self) -> bool:
        if self._enabled:
            return True
        if not self.supported:
            self.statusChanged.emit(
                "Global hotkeys are available on Windows. "
                "On this OS, use the buttons or focus the overlay for shortcuts."
            )
            return False

        backend = _WindowsHotkeyBackend(self)
        backend.triggered.connect(self.triggered.emit)
        ok, detail = backend.register_all(HOTKEY_BINDINGS)
        if not ok:
            self.statusChanged.emit(detail)
            return False

        self._backend = backend
        self._enabled = True
        self.statusChanged.emit(
            "Global hotkeys on — works even while Warframe is focused "
            "(OS-registered; not a low-level hook)."
        )
        return True

    def stop(self) -> None:
        if self._backend is not None:
            self._backend.unregister_all()
            self._backend.deleteLater()
            self._backend = None
        was_enabled = self._enabled
        self._enabled = False
        if was_enabled:
            self.statusChanged.emit("Global hotkeys off — use the buttons anytime.")


class _WindowsHotkeyBackend(QAbstractNativeEventFilter, QObject):
    MOD_CONTROL = 0x0002
    MOD_SHIFT = 0x0004
    MOD_NOREPEAT = 0x4000
    WM_HOTKEY = 0x0312

    triggered = Signal(str)

    def __init__(self, parent: QObject | None = None) -> None:
        QObject.__init__(self, parent)
        QAbstractNativeEventFilter.__init__(self)
        self._ids: dict[int, str] = {}
        self._user32 = None
        self._installed = False

    def register_all(self, bindings: tuple[HotkeyBinding, ...]) -> tuple[bool, str]:
        import ctypes  # noqa: PLC0415 — Windows RegisterHotKey only

        from PySide6.QtWidgets import QApplication  # noqa: PLC0415

        qapp = QApplication.instance()
        if qapp is None:
            return False, "No QApplication available for global hotkeys."

        self._user32 = ctypes.windll.user32
        mods = self.MOD_CONTROL | self.MOD_SHIFT | self.MOD_NOREPEAT
        registered: list[int] = []

        for index, binding in enumerate(bindings, start=1):
            hotkey_id = 1000 + index
            ok = bool(self._user32.RegisterHotKey(None, hotkey_id, mods, binding.vk))
            if not ok:
                for existing in registered:
                    self._user32.UnregisterHotKey(None, existing)
                self._ids.clear()
                return (
                    False,
                    f"Could not register {binding.chord} globally "
                    "(maybe another app owns it). Buttons still work.",
                )
            self._ids[hotkey_id] = binding.action_id
            registered.append(hotkey_id)

        qapp.installNativeEventFilter(self)
        self._installed = True
        return True, "ok"

    def unregister_all(self) -> None:
        from PySide6.QtWidgets import QApplication  # noqa: PLC0415

        qapp = QApplication.instance()
        if qapp is not None and self._installed:
            qapp.removeNativeEventFilter(self)
            self._installed = False
        if self._user32 is not None:
            for hotkey_id in list(self._ids):
                self._user32.UnregisterHotKey(None, hotkey_id)
        self._ids.clear()

    def nativeEventFilter(self, eventType, message):  # noqa: N802, ANN001
        if isinstance(eventType, (bytes, bytearray)):
            et = eventType.decode("utf-8", errors="ignore")
        else:
            et = str(eventType)
        if et not in {"windows_generic_MSG", "windows_dispatcher_MSG"}:
            return False
        try:
            import ctypes  # noqa: PLC0415
            from ctypes import wintypes  # noqa: PLC0415

            msg = wintypes.MSG.from_address(int(message))
            if msg.message != self.WM_HOTKEY:
                return False
            action_id = self._ids.get(int(msg.wParam))
            if action_id:
                self.triggered.emit(action_id)
                return True
        except Exception:
            return False
        return False


def describe_hotkeys() -> str:
    return " · ".join(f"{b.chord} {b.label.lower()}" for b in HOTKEY_BINDINGS)
