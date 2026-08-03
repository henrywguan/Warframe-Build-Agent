from __future__ import annotations

from .local_knowledge import (
    LOCAL_BUILDS_AVAILABLE_MARKER,
    format_online_search_confirmation,
    inspect_local_builds,
)
from .models import ActionRecommendation, Goal, LoadoutContext, WeaponSlot


def recommend_actions(context: LoadoutContext) -> list[ActionRecommendation]:
    """Return prioritized overlay actions for Steel Path / endgame goals.

    Agent-calculated (rule-based) recommendations from loadout fields — not a live
    Overframe/YouTube scrape and not OCR. Local pack builds are checked first; if
    missing, an action card asks the player to confirm online search via chat.
    """
    weapon = context.weapon_name.strip() or "this weapon"
    slot = context.slot
    goal = context.goal
    notes = context.notes.lower()
    mods = {m.lower() for m in context.detected_mods}

    actions: list[ActionRecommendation] = []

    actions.append(
        ActionRecommendation(
            priority=1,
            category="Focus",
            title=f"Lock goal: {_goal_label(goal)}",
            detail=_goal_brief(goal, slot),
            why="Recommendations below assume this target content profile.",
        )
    )

    local = inspect_local_builds(weapon)
    if local.has_local_builds:
        actions.append(
            ActionRecommendation(
                priority=2,
                category="Local data",
                title=f"Compare local builds for {weapon}",
                detail=(
                    f"{LOCAL_BUILDS_AVAILABLE_MARKER}: {local.build_count} cached "
                    f"Overframe/import build(s). Prefer local pack comparison before "
                    f"any online search."
                ),
                why="Source policy: local database first for build comparisons.",
            )
        )
    else:
        actions.append(
            ActionRecommendation(
                priority=2,
                category="Local data",
                title="Confirm before online build search",
                detail=(
                    f"{local.detail} Open overlay chat and confirm online search "
                    f"(Overframe / YouTube / public sources) if you want community "
                    f"comparisons. Until then, cards below stay agent-calculated.\n\n"
                    f"{format_online_search_confirmation(weapon)}"
                ),
                why="No local Overframe builds cached — ask before searching online.",
            )
        )

    if slot in {WeaponSlot.PRIMARY, WeaponSlot.SECONDARY}:
        actions.extend(_gun_actions(weapon, goal, mods, notes))
    elif slot == WeaponSlot.MELEE:
        actions.extend(_melee_actions(weapon, goal, mods, notes))
    else:
        actions.extend(_warframe_actions(weapon, goal, mods, notes))

    actions.append(
        ActionRecommendation(
            priority=90,
            category="Validate",
            title="Simulate on Steel Path trash + eximus",
            detail=(
                f"Test {weapon} on a short SP mission after the swaps. "
                "If kill time feels slow, prioritize armor strip / viral setup "
                "before chasing raw arsenal DPS."
            ),
            why="Arsenal DPS ignores armor, status weighting, and conditional mods.",
        )
    )

    actions.sort(key=lambda a: a.priority)
    return actions


def _goal_label(goal: Goal) -> str:
    return {
        Goal.STEEL_PATH: "Steel Path clear speed",
        Goal.MAX_DAMAGE: "Max raw damage",
        Goal.ENDGAME: "Endgame / EDA-style durability",
    }[goal]


def _goal_brief(goal: Goal, slot: WeaponSlot) -> str:
    if goal == Goal.STEEL_PATH:
        return (
            "Favor viral + heat (or corrosive + heat where viral is covered), "
            "reliable crit or status, and easy uptime — not glass-cannon arsenal numbers."
        )
    if goal == Goal.MAX_DAMAGE:
        return (
            "Stack faction/base multipliers, crit chance/damage, and conditional "
            f"multipliers that stay active on your {slot.value}."
        )
    return (
        "Balance kill speed with survivability: strip armor, keep ammo/energy "
        "comfortable, and avoid brittle one-room glass builds."
    )


def _has_any(mods: set[str], *needles: str) -> bool:
    return any(any(n in mod for n in needles) for mod in mods)


def _gun_actions(
    weapon: str,
    goal: Goal,
    mods: set[str],
    notes: str,
) -> list[ActionRecommendation]:
    actions: list[ActionRecommendation] = []

    if not _has_any(mods, "serration", "pistol gambit", "point blank", "hornet strike") and "no base damage" not in notes:
        actions.append(
            ActionRecommendation(
                priority=10,
                category="Mod",
                title="Confirm a base-damage mod is equipped",
                detail=(
                    f"On {weapon}, keep a primary base-damage mod (Serration / "
                    "Point Blank / Hornet Strike family) unless a stronger unique "
                    "replaces it."
                ),
                why="Most SP guns still want a clean damage floor before element stacking.",
            )
        )

    if goal in {Goal.STEEL_PATH, Goal.ENDGAME} and not _has_any(
        mods, "viral", "malign", "fester", "pathogen", "infect"
    ):
        actions.append(
            ActionRecommendation(
                priority=20,
                category="Element",
                title="Build toward Viral (+ Heat) for general SP",
                detail=(
                    f"For {weapon}, aim Viral + Heat unless your Warframe already "
                    "applies Viral. Heat helps against armor and clustered targets."
                ),
                why="Viral multiplies health damage; Heat adds armor softening and DoT.",
            )
        )

    if goal == Goal.MAX_DAMAGE and not _has_any(mods, "bane", "cleanse", "expel", "smite"):
        actions.append(
            ActionRecommendation(
                priority=25,
                category="Multiplier",
                title="Add the matching faction damage mod",
                detail=(
                    "Equip the correct Bane/Expel/Cleanse/Smite variant for the "
                    "node you are farming. Swap it when the faction changes."
                ),
                why="Faction mods are among the strongest conditional damage multipliers.",
            )
        )

    if not _has_any(mods, "critical", "point strike", "target cracker", "pistol gambit", "hollow point"):
        actions.append(
            ActionRecommendation(
                priority=30,
                category="Crit",
                title="Decide crit vs status — don't half-invest",
                detail=(
                    f"If {weapon} has a usable crit stat sheet, fully support crit "
                    "(chance + damage). If it is status-led, invest in multishot/"
                    "element chance instead of weak crit hybrids."
                ),
                why="Hybrid mid-crit setups often underperform dedicated routes on SP.",
            )
        )

    if "ammo" in notes or "reload" in notes:
        actions.append(
            ActionRecommendation(
                priority=40,
                category="QoL",
                title="Fix ammo economy before more damage mods",
                detail=(
                    "Add ammo mutation / expansion / faster reload so the build "
                    "stays online in long SP missions."
                ),
                why="Dead DPS during reload/ammo drought loses more time than a smaller number.",
            )
        )

    actions.append(
        ActionRecommendation(
            priority=50,
            category="Arcane / Exilus",
            title="Fill flex slots last",
            detail=(
                "Priority order: core damage/elements → multishot → fire rate/"
                "QoL → exilus quality-of-life → arcane that matches your trigger style."
            ),
            why="Flex mods should not displace the multiplicative core.",
        )
    )
    return actions


def _melee_actions(
    weapon: str,
    goal: Goal,
    mods: set[str],
    notes: str,
) -> list[ActionRecommendation]:
    actions = [
        ActionRecommendation(
            priority=10,
            category="Stance",
            title="Confirm stance matches your range style",
            detail=(
                f"For {weapon}, pick a stance with reliable hitboxes for the tileset "
                "you farm. Range without control still whiffs on SP."
            ),
            why="Melee clear speed is stance + range + status uptime, not just channel force.",
        )
    ]
    if not _has_any(mods, "pressure point", "primed pressure", "condition overload"):
        actions.append(
            ActionRecommendation(
                priority=15,
                category="Mod",
                title="Anchor with Pressure Point or Condition Overload",
                detail=(
                    "Use Condition Overload when your kit applies multiple statuses; "
                    "otherwise start from a strong base-damage melee mod."
                ),
            )
        )
    if goal in {Goal.STEEL_PATH, Goal.ENDGAME}:
        actions.append(
            ActionRecommendation(
                priority=20,
                category="Element",
                title="Prefer Viral / Heat or corrosive support",
                detail=(
                    "Melee SP clears want status that softens crowds. Pair with a "
                    "primer or Warframe strip if the weapon itself is slow to status."
                ),
            )
        )
    if "range" in notes:
        actions.append(
            ActionRecommendation(
                priority=35,
                category="QoL",
                title="Add Reach / Primed Reach",
                detail="Increase melee radius so you are not whiffing on eximus packs.",
            )
        )
    return actions


def _warframe_actions(
    frame: str,
    goal: Goal,
    mods: set[str],
    notes: str,
) -> list[ActionRecommendation]:
    actions = [
        ActionRecommendation(
            priority=10,
            category="Survivability",
            title="Make the frame SP-stable before weapon min-max",
            detail=(
                f"For {frame}, secure a survivability route (shield gate, armor/"
                "Adaptation, invis, or overguard) that holds under SP eximus pressure."
            ),
            why="Dead frames cancel weapon DPS. Survivability is part of clear speed.",
        )
    ]
    if goal == Goal.ENDGAME:
        actions.append(
            ActionRecommendation(
                priority=20,
                category="Ability",
                title="Keep one strip / crowd tool online",
                detail=(
                    "Reserve capacity for armor strip, crowd control, or weapon buff "
                    "uptime that your guns rely on."
                ),
            )
        )
    if not _has_any(mods, "intensify", "blind rage", "transient", "stretch", "overextended"):
        actions.append(
            ActionRecommendation(
                priority=30,
                category="Mods",
                title="Balance strength / range / duration for the kit",
                detail=(
                    "Don't overcap Blind Rage if energy or duration collapses your loop. "
                    "Match the ability that actually carries the mission."
                ),
            )
        )
    if "energy" in notes:
        actions.append(
            ActionRecommendation(
                priority=40,
                category="Energy",
                title="Solve energy before more power strength",
                detail="Add Equilibrium / Arcane Energize / amber shards / Zenurik as needed.",
            )
        )
    return actions
