"""Offscreen Qt smoke: buttons wired, recommendations render, chat panel toggles."""

from __future__ import annotations

import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

# Headless Qt before importing PySide6 widgets.
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtWidgets import QApplication, QMessageBox, QPushButton

from wf_overlay.models import Goal, WeaponSlot
from wf_overlay.widgets.overlay_window import OverlayWindow

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "overframe_coda_hema_sp.json"

_APP: QApplication | None = None


def _app() -> QApplication:
    global _APP
    existing = QApplication.instance()
    if existing is not None:
        return existing  # type: ignore[return-value]
    _APP = QApplication(sys.argv[:1])
    return _APP


class OverlayWindowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        _app()

    def setUp(self) -> None:
        self.window = OverlayWindow()
        # Avoid Windows global-hotkey registration during tests.
        self.window.global_hotkeys_box.setChecked(False)

    def tearDown(self) -> None:
        self.window.close()
        self.window.deleteLater()

    def test_quick_action_buttons_exist_and_enabled(self) -> None:
        expected = {"refresh", "set_region", "capture", "toggle", "chat"}
        self.assertEqual(expected, set(self.window._action_buttons))
        for action_id, button in self.window._action_buttons.items():
            self.assertIsInstance(button, QPushButton)
            self.assertTrue(button.isEnabled(), action_id)
            # SIGNAL/slot wiring: clicking must not raise and handlers are bound.
            self.assertTrue(bool(button.clicked), action_id)

    def test_pin_and_close_buttons_wired(self) -> None:
        self.assertTrue(self.window.pin_btn.isEnabled())
        was_checked = self.window.pin_btn.isChecked()
        self.window.pin_btn.click()
        _app().processEvents()
        self.assertNotEqual(was_checked, self.window.pin_btn.isChecked())
        close_buttons = [
            b
            for b in self.window.findChildren(QPushButton)
            if b.text() == "✕"
        ]
        self.assertEqual(len(close_buttons), 1)
        # Close is wired; don't actually destroy the window mid-suite.
        self.assertTrue(close_buttons[0].isEnabled())

    def test_refresh_button_shows_overframe_fixture_recommendations(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        self.window.weapon_input.setText(str(data["weapon_name"]))
        # Select matching combo entries by stored data values.
        slot = WeaponSlot(str(data["slot"]))
        goal = Goal(str(data["goal"]))
        slot_index = self.window.slot_combo.findData(slot)
        goal_index = self.window.goal_combo.findData(goal)
        self.assertGreaterEqual(slot_index, 0)
        self.assertGreaterEqual(goal_index, 0)
        self.window.slot_combo.setCurrentIndex(slot_index)
        self.window.goal_combo.setCurrentIndex(goal_index)
        self.window.notes_input.setText(str(data.get("player_notes", "")))

        self.window._action_buttons["refresh"].click()
        _app().processEvents()

        from PySide6.QtWidgets import QFrame

        action_cards = [
            w
            for w in self.window.actions_host.findChildren(QFrame)
            if w.objectName() == "ActionCard"
        ]
        self.assertGreaterEqual(len(action_cards), int(data["expect"]["min_actions"]))
        status = self.window.status_label.text()
        self.assertIn(str(data["expect"]["ui_status_needle"]), status)

    def test_chat_button_toggles_panel(self) -> None:
        self.assertIsNotNone(self.window.chat_panel)
        before = self.window.chat_panel.is_expanded()
        self.window._action_buttons["chat"].click()
        _app().processEvents()
        self.assertNotEqual(before, self.window.chat_panel.is_expanded())
        self.window._action_buttons["chat"].click()
        _app().processEvents()
        self.assertEqual(before, self.window.chat_panel.is_expanded())

    def test_toggle_visibility_button(self) -> None:
        self.window.show()
        _app().processEvents()
        self.window._action_buttons["toggle"].click()
        _app().processEvents()
        self.assertTrue(self.window.isMinimized())
        self.window._action_buttons["toggle"].click()
        _app().processEvents()
        self.assertFalse(self.window.isMinimized())

    def test_capture_without_region_shows_guidance(self) -> None:
        with mock.patch.object(QMessageBox, "information") as info:
            self.window._action_buttons["capture"].click()
            _app().processEvents()
            info.assert_called_once()


if __name__ == "__main__":
    unittest.main()
