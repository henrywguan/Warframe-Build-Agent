"""Integrity: overlay chat + action cards follow local-first + online confirmation."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from wf_overlay.chat_client import send_chat
from wf_overlay.chat_config import ChatSettings
from wf_overlay.chat_prompt import SOURCE_POLICY, SYSTEM_PROMPT, build_system_prompt
from wf_overlay.local_knowledge import (
    LOCAL_BUILDS_AVAILABLE_MARKER,
    ONLINE_SEARCH_CONFIRMATION_MARKER,
    format_online_search_confirmation,
    inspect_local_builds,
)
from wf_overlay.models import Goal, LoadoutContext, WeaponSlot
from wf_overlay.recommend import recommend_actions

ROOT = Path(__file__).resolve().parents[2]


class SourcePolicyTests(unittest.TestCase):
    def test_overlay_prompt_requires_confirmation_before_online_search(self) -> None:
        self.assertIn("Source policy", SYSTEM_PROMPT)
        self.assertIn("ONLINE_SEARCH_CONFIRMATION_REQUIRED", SOURCE_POLICY)
        self.assertIn("yes/no", SOURCE_POLICY)
        self.assertIn("local pack", SOURCE_POLICY)
        prompt = build_system_prompt("weapon/frame: Coda Hema\nslot: primary")
        self.assertIn("Coda Hema", prompt)
        self.assertIn("confirmation", prompt.lower())

    def test_action_cards_gate_online_search_when_local_builds_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "data" / "knowledge"
            (root).mkdir(parents=True)
            (root / "manifest.json").write_text("{}", encoding="utf-8")
            with mock.patch(
                "wf_overlay.recommend.inspect_local_builds",
                return_value=inspect_local_builds("Missing Weapon", start=Path(tmp)),
            ):
                actions = recommend_actions(
                    LoadoutContext(
                        weapon_name="Missing Weapon",
                        slot=WeaponSlot.PRIMARY,
                        goal=Goal.STEEL_PATH,
                        notes="",
                        detected_mods=[],
                    )
                )
        titles = [a.title for a in actions]
        self.assertTrue(any("Confirm before online" in t for t in titles))
        confirm = next(a for a in actions if "Confirm before online" in a.title)
        self.assertIn(ONLINE_SEARCH_CONFIRMATION_MARKER, confirm.detail)

    def test_action_cards_prefer_local_builds_when_cached(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "data" / "knowledge"
            builds_dir = root / "builds" / "by-item"
            builds_dir.mkdir(parents=True)
            (root / "manifest.json").write_text("{}", encoding="utf-8")
            (builds_dir / "coda-hema.json").write_text(
                json.dumps(
                    {
                        "id": "coda-hema",
                        "builds": [{"rank": 1, "name": "Sample", "summary": "x"}],
                    }
                ),
                encoding="utf-8",
            )
            status = inspect_local_builds("Coda Hema", start=Path(tmp))
            self.assertTrue(status.has_local_builds)
            with mock.patch("wf_overlay.recommend.inspect_local_builds", return_value=status):
                actions = recommend_actions(
                    LoadoutContext(
                        weapon_name="Coda Hema",
                        slot=WeaponSlot.PRIMARY,
                        goal=Goal.STEEL_PATH,
                        notes="",
                        detected_mods=[],
                    )
                )
        local_card = next(a for a in actions if a.category == "Local data")
        self.assertIn(LOCAL_BUILDS_AVAILABLE_MARKER, local_card.detail)
        self.assertIn("local", local_card.title.lower())

    def test_confirmation_helper_wording(self) -> None:
        text = format_online_search_confirmation("Aegrit")
        self.assertIn(ONLINE_SEARCH_CONFIRMATION_MARKER, text)
        self.assertIn("Aegrit", text)
        self.assertIn("yes", text.lower())

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
        self.assertIn("Coda Hema", messages[0]["content"])
        self.assertIn("source policy", messages[1]["content"].lower())

    def test_repo_source_policy_doc_exists(self) -> None:
        text = (ROOT / "docs" / "source-policy.md").read_text(encoding="utf-8")
        self.assertIn("ONLINE_SEARCH_CONFIRMATION_REQUIRED", text)
        self.assertIn("Local knowledge pack first", text)
        self.assertIn("estimate_modded_dps", text)


if __name__ == "__main__":
    unittest.main()
