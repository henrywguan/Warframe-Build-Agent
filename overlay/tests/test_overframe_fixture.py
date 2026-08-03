"""Integrity: Overframe-style fixture → recommendations (and optional UI cards)."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from wf_overlay.models import Goal, LoadoutContext, WeaponSlot
from wf_overlay.recommend import recommend_actions

FIXTURES = Path(__file__).resolve().parent / "fixtures"
SAMPLE = FIXTURES / "overframe_coda_hema_sp.json"


def load_fixture(path: Path = SAMPLE) -> tuple[dict, LoadoutContext]:
    data = json.loads(path.read_text(encoding="utf-8"))
    ctx = LoadoutContext(
        weapon_name=str(data["weapon_name"]),
        slot=WeaponSlot(str(data["slot"])),
        goal=Goal(str(data["goal"])),
        notes=str(data.get("player_notes", "")),
        detected_mods=[str(m) for m in data.get("detected_mods", [])],
    )
    return data, ctx


class OverframeFixtureTests(unittest.TestCase):
    def test_fixture_assets_exist(self) -> None:
        self.assertTrue(SAMPLE.is_file(), f"missing {SAMPLE}")
        data, _ = load_fixture()
        shot = FIXTURES / str(data["screenshot"])
        self.assertTrue(shot.is_file(), f"missing screenshot {shot}")
        self.assertGreater(shot.stat().st_size, 1000)

    def test_overframe_sample_yields_build_recommendations(self) -> None:
        data, ctx = load_fixture()
        actions = recommend_actions(ctx)
        expect = data["expect"]
        self.assertGreaterEqual(len(actions), int(expect["min_actions"]))
        blob = " ".join(f"{a.title} {a.detail} {a.category}".lower() for a in actions)
        for needle in expect["title_needles"]:
            self.assertIn(needle.lower(), blob, f"expected {needle!r} in recommendations")
        # Priorities stay sorted for the overlay action list
        priorities = [a.priority for a in actions]
        self.assertEqual(priorities, sorted(priorities))


if __name__ == "__main__":
    unittest.main()
