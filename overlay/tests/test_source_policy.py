"""Integrity: overlay chat + action cards follow offline-facts / build-source policy."""

from __future__ import annotations

import unittest
from pathlib import Path
from unittest import mock

from wf_overlay.chat_client import send_chat
from wf_overlay.chat_config import ChatSettings
from wf_overlay.chat_prompt import SOURCE_POLICY, SYSTEM_PROMPT, build_system_prompt
from wf_overlay.recommend import recommend_actions
from wf_overlay.models import Goal, LoadoutContext, WeaponSlot

ROOT = Path(__file__).resolve().parents[2]


class SourcePolicyTests(unittest.TestCase):
    def test_overlay_prompt_prefers_offline_facts_and_build_sources(self) -> None:
        self.assertIn("Source policy", SYSTEM_PROMPT)
        self.assertIn("offline local knowledge", SOURCE_POLICY)
        self.assertIn("Overframe", SOURCE_POLICY)
        self.assertIn("YouTube", SOURCE_POLICY)
        self.assertIn("agent-calculated", SOURCE_POLICY)
        self.assertIn("action cards", SOURCE_POLICY.lower())
        prompt = build_system_prompt("weapon/frame: Coda Hema\nslot: primary")
        self.assertIn("Coda Hema", prompt)
        self.assertIn("Overframe", prompt)

    def test_action_cards_are_agent_calculated_from_loadout(self) -> None:
        doc = recommend_actions.__doc__ or ""
        self.assertIn("Agent-calculated", doc)
        actions = recommend_actions(
            LoadoutContext(
                weapon_name="Coda Hema",
                slot=WeaponSlot.PRIMARY,
                goal=Goal.STEEL_PATH,
                notes="",
                detected_mods=[],
            )
        )
        self.assertGreaterEqual(len(actions), 3)

    def test_web_api_path_seeds_loadout_and_source_policy_ack(self) -> None:
        captured: dict[str, object] = {}

        def fake_post(url: str, body: dict, headers: dict) -> dict:
            captured["url"] = url
            captured["body"] = body
            return {"message": {"content": "ok from web"}}

        settings = ChatSettings(
            api_key="",
            base_url="https://example.invalid/v1",
            model="gpt-test",
            chat_api_url="https://example.invalid/api/chat",
            chat_password="secret",
        )
        with mock.patch("wf_overlay.chat_client._post_json", side_effect=fake_post):
            reply = send_chat(
                [{"role": "user", "content": "best build?"}],
                loadout_context="weapon/frame: Coda Hema\nslot: primary",
                settings=settings,
            )
        self.assertEqual(reply, "ok from web")
        messages = captured["body"]["messages"]  # type: ignore[index]
        self.assertEqual(messages[0]["role"], "user")
        self.assertIn("Coda Hema", messages[0]["content"])
        self.assertIn("source policy", messages[1]["content"].lower())
        self.assertEqual(messages[-1]["content"], "best build?")

    def test_repo_source_policy_doc_exists(self) -> None:
        text = (ROOT / "docs" / "source-policy.md").read_text(encoding="utf-8")
        self.assertIn("web chat", text.lower())
        self.assertIn("overlay", text.lower())
        self.assertIn("YouTube", text)


if __name__ == "__main__":
    unittest.main()
