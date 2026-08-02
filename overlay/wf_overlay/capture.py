from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from .models import ScreenRegion
from .regions import config_dir


def captures_dir() -> Path:
    path = config_dir() / "captures"
    path.mkdir(parents=True, exist_ok=True)
    return path


def grab_region(region: ScreenRegion) -> Image.Image:
    import mss
    import mss.tools

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
