from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


class Goal(str, Enum):
    STEEL_PATH = "steel_path"
    MAX_DAMAGE = "max_damage"
    ENDGAME = "endgame"


class WeaponSlot(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    MELEE = "melee"
    WARFRAME = "warframe"


@dataclass(slots=True)
class ScreenRegion:
    name: str
    left: int
    top: int
    width: int
    height: int

    def clamp(self) -> ScreenRegion:
        return ScreenRegion(
            name=self.name,
            left=max(0, self.left),
            top=max(0, self.top),
            width=max(1, self.width),
            height=max(1, self.height),
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ScreenRegion:
        return cls(
            name=str(data["name"]),
            left=int(data["left"]),
            top=int(data["top"]),
            width=int(data["width"]),
            height=int(data["height"]),
        )


@dataclass(slots=True)
class LoadoutContext:
    weapon_name: str = ""
    slot: WeaponSlot = WeaponSlot.PRIMARY
    goal: Goal = Goal.STEEL_PATH
    notes: str = ""
    detected_mods: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ActionRecommendation:
    title: str
    detail: str
    priority: int
    category: str
    why: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
