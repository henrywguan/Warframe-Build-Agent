import unittest

from wf_overlay.models import Goal, LoadoutContext, WeaponSlot
from wf_overlay.recommend import recommend_actions


class RecommendTests(unittest.TestCase):
    def test_steel_path_primary_has_ordered_actions(self) -> None:
        actions = recommend_actions(
            LoadoutContext(
                weapon_name="Coda Hema",
                slot=WeaponSlot.PRIMARY,
                goal=Goal.STEEL_PATH,
            )
        )
        self.assertGreaterEqual(len(actions), 3)
        priorities = [a.priority for a in actions]
        self.assertEqual(priorities, sorted(priorities))
        titles = " ".join(a.title.lower() for a in actions)
        self.assertIn("viral", titles)

    def test_warframe_endgame_mentions_survivability(self) -> None:
        actions = recommend_actions(
            LoadoutContext(
                weapon_name="Revenant",
                slot=WeaponSlot.WARFRAME,
                goal=Goal.ENDGAME,
            )
        )
        blob = " ".join(f"{a.title} {a.detail}".lower() for a in actions)
        self.assertIn("surviv", blob)


if __name__ == "__main__":
    unittest.main()
