"""Screen capture helpers.

Policy: pixels only. This module uses OS desktop capture (mss) of a
user-selected rectangle. It must never open, attach to, read, or write the
Warframe process.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from .models import ScreenRegion
from .policy import assert_external_only
from .regions import config_dir


def captures_dir() -> Path:
    path = config_dir() / "captures"
    path.mkdir(parents=True, exist_ok=True)
    return path


def grab_region(region: ScreenRegion) -> Image.Image:
    """Capture a desktop rectangle via the OS compositor / screen buffer."""
    assert_external_only()
    import mss

    region = region.clamp()
    monitor = {
        "left": region.left,
        "top": region.top,
        "width": region.width,
        "height": region.height,
    }
    with mss.mss() as sct:
        shot = sct.grab(monitor)
        return Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")


def save_capture(image: Image.Image, label: str = "arsenal") -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = captures_dir() / f"{label}-{stamp}.png"
    image.save(path)
    return path


def capture_saved_region(region: ScreenRegion, label: str | None = None) -> Path:
    image = grab_region(region)
    return save_capture(image, label=label or region.name)
