"""Load chat settings from env or ~/.config/warframe-build-agent/overlay.env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .regions import config_dir


@dataclass(slots=True)
class ChatSettings:
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    # Optional: POST to a running web chat backend instead of OpenAI directly.
    chat_api_url: str = ""
    chat_password: str = ""

    @property
    def configured(self) -> bool:
        if self.chat_api_url.strip():
            return True
        return bool(self.api_key.strip())


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_chat_settings() -> ChatSettings:
    file_values = _parse_env_file(config_dir() / "overlay.env")

    def get(name: str, default: str = "") -> str:
        return os.environ.get(name, file_values.get(name, default)).strip()

    return ChatSettings(
        api_key=get("OPENAI_API_KEY"),
        base_url=get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        or "https://api.openai.com/v1",
        model=get("OPENAI_MODEL", "gpt-4o-mini") or "gpt-4o-mini",
        chat_api_url=get("CHAT_API_URL"),
        chat_password=get("CHAT_PASSWORD"),
    )


def settings_help_text() -> str:
    path = config_dir() / "overlay.env"
    return (
        "Chat needs OPENAI_API_KEY (or CHAT_API_URL to your web chat).\n"
        f"Set env vars or create {path} with:\n"
        "OPENAI_API_KEY=sk-...\n"
        "OPENAI_MODEL=gpt-4o-mini\n"
        "# optional: CHAT_API_URL=http://127.0.0.1:3000/api/chat"
    )
