import tempfile
import unittest
from pathlib import Path
from unittest import mock

from wf_overlay.chat_config import load_chat_settings
from wf_overlay.chat_prompt import build_system_prompt


class ChatConfigTests(unittest.TestCase):
    def test_load_settings_from_env_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            config_dir = Path(tmp)
            env_path = config_dir / "overlay.env"
            env_path.write_text(
                "OPENAI_API_KEY=sk-test\nOPENAI_MODEL=gpt-test\n",
                encoding="utf-8",
            )
            with mock.patch("wf_overlay.chat_config.config_dir", return_value=config_dir):
                with mock.patch.dict("os.environ", {}, clear=True):
                    settings = load_chat_settings()
            self.assertTrue(settings.configured)
            self.assertEqual(settings.api_key, "sk-test")
            self.assertEqual(settings.model, "gpt-test")

    def test_system_prompt_includes_loadout_context(self) -> None:
        prompt = build_system_prompt("weapon/frame: Laetum\nslot: secondary")
        self.assertIn("Laetum", prompt)
        self.assertIn("Warframe Build Agent", prompt)


if __name__ == "__main__":
    unittest.main()
