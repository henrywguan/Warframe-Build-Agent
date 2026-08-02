import unittest

from wf_overlay.hotkeys import HOTKEY_BINDINGS, GlobalHotkeyManager, describe_hotkeys


class HotkeyCatalogTests(unittest.TestCase):
    def test_bindings_cover_core_actions(self) -> None:
        ids = {binding.action_id for binding in HOTKEY_BINDINGS}
        self.assertEqual(ids, {"refresh", "set_region", "capture", "toggle"})
        self.assertIn("Ctrl+Shift+A", describe_hotkeys())

    def test_manager_reports_platform_support(self) -> None:
        manager = GlobalHotkeyManager()
        # In this Linux CI/dev environment global registration is unsupported.
        if not manager.supported:
            self.assertFalse(manager.start())
            self.assertFalse(manager.enabled)


if __name__ == "__main__":
    unittest.main()
