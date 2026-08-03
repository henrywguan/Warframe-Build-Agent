from __future__ import annotations

import json
from pathlib import Path

from .models import ScreenRegion

DEFAULT_REGION_NAMES = ("mod_grid", "stats_panel")


def config_dir() -> Path:
    return Path.home() / ".config" / "warframe-build-agent"


def regions_path() -> Path:
    return config_dir() / "overlay-regions.json"


def load_regions() -> dict[str, ScreenRegion]:
    path = regions_path()
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    regions: dict[str, ScreenRegion] = {}
    for key, value in raw.items():
        if isinstance(value, dict):
            data = {"name": key, **value}
            regions[key] = ScreenRegion.from_dict(data).clamp()
    return regions


def save_regions(regions: dict[str, ScreenRegion]) -> Path:
    path = regions_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    compact = {
        name: {
            "left": region.left,
            "top": region.top,
            "width": region.width,
            "height": region.height,
        }
        for name, region in regions.items()
    }
    path.write_text(json.dumps(compact, indent=2), encoding="utf-8")
    return path


def upsert_region(region: ScreenRegion) -> dict[str, ScreenRegion]:
    regions = load_regions()
    regions[region.name] = region.clamp()
    save_regions(regions)
    return regions
