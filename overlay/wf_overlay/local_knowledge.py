"""Read the repo local knowledge pack for overlay build gating."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


ONLINE_SEARCH_CONFIRMATION_MARKER = "ONLINE_SEARCH_CONFIRMATION_REQUIRED"
LOCAL_BUILDS_AVAILABLE_MARKER = "LOCAL_BUILDS_AVAILABLE"


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "").replace("'", ""))
    return slug.strip("-")


def knowledge_roots(start: Path | None = None) -> list[Path]:
    here = (start or Path.cwd()).resolve()
    candidates = [
        here / "data" / "knowledge",
        here.parent / "data" / "knowledge",
        here.parent.parent / "data" / "knowledge",
        Path(__file__).resolve().parents[2] / "data" / "knowledge",
    ]
    out: list[Path] = []
    seen: set[Path] = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if (candidate / "manifest.json").is_file():
            out.append(candidate)
    return out


@dataclass(slots=True)
class LocalBuildStatus:
    item_name: str
    knowledge_root: Path | None
    has_local_builds: bool
    build_count: int
    detail: str


def inspect_local_builds(item_name: str, start: Path | None = None) -> LocalBuildStatus:
    name = item_name.strip() or "this item"
    roots = knowledge_roots(start)
    if not roots:
        return LocalBuildStatus(
            item_name=name,
            knowledge_root=None,
            has_local_builds=False,
            build_count=0,
            detail="Local knowledge pack not found.",
        )
    root = roots[0]
    path = root / "builds" / "by-item" / f"{_slugify(name)}.json"
    if not path.is_file():
        return LocalBuildStatus(
            item_name=name,
            knowledge_root=root,
            has_local_builds=False,
            build_count=0,
            detail=f"No local Overframe/import builds cached for {name}.",
        )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return LocalBuildStatus(
            item_name=name,
            knowledge_root=root,
            has_local_builds=False,
            build_count=0,
            detail=f"Local build file unreadable for {name}.",
        )
    builds = data.get("builds") if isinstance(data, dict) else None
    count = len(builds) if isinstance(builds, list) else 0
    return LocalBuildStatus(
        item_name=name,
        knowledge_root=root,
        has_local_builds=count > 0,
        build_count=count,
        detail=(
            f"{LOCAL_BUILDS_AVAILABLE_MARKER}: {count} local build(s) for {name}."
            if count
            else f"No local Overframe/import builds cached for {name}."
        ),
    )


def format_online_search_confirmation(item_name: str) -> str:
    item = item_name.strip() or "this item"
    return (
        f"{ONLINE_SEARCH_CONFIRMATION_MARKER} for {item}\n"
        f"Local pack has no cached Overframe community builds for {item}.\n"
        "If Online search is on in the web chat UI, live community crawl runs "
        "automatically — do not ask the player to type yes/no.\n"
        "If Online search is off: stay local + agent-calculated only, and tell "
        "the player to enable the Online search toggle for a live crawl."
    )
