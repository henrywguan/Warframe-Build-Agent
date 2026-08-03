"""External chat client for the overlay (OpenAI-compatible or local web API).

Uses public HTTPS only — never touches the Warframe process.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from .chat_config import ChatSettings, load_chat_settings, settings_help_text
from .chat_prompt import build_system_prompt
from .policy import assert_external_only


class ChatClientError(RuntimeError):
    pass


def send_chat(
    messages: list[dict[str, str]],
    *,
    loadout_context: str = "",
    settings: ChatSettings | None = None,
) -> str:
    """Send a chat turn and return the assistant text."""
    assert_external_only()
    cfg = settings or load_chat_settings()
    if not cfg.configured:
        raise ChatClientError(settings_help_text())

    if cfg.chat_api_url:
        return _send_via_web_api(messages, cfg, loadout_context=loadout_context)

    payload_messages: list[dict[str, str]] = [
        {"role": "system", "content": build_system_prompt(loadout_context)},
        *messages,
    ]
    body = {
        "model": cfg.model,
        "temperature": 0.4,
        "messages": payload_messages,
    }
    url = cfg.base_url.rstrip("/") + "/chat/completions"
    data = _post_json(
        url,
        body,
        headers={
            "Authorization": f"Bearer {cfg.api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ChatClientError(f"Unexpected chat response shape: {data!r}") from exc
    text = (content or "").strip()
    if not text:
        raise ChatClientError("Model returned an empty response.")
    return text


def _send_via_web_api(
    messages: list[dict[str, str]],
    cfg: ChatSettings,
    *,
    loadout_context: str = "",
) -> str:
    headers = {"Content-Type": "application/json"}
    # Web chat may expect a password cookie; also accept a header for overlay use.
    if cfg.chat_password:
        headers["x-chat-password"] = cfg.chat_password
        headers["Cookie"] = f"wf_chat_auth={cfg.chat_password}"
    # Web API applies its own system prompt (incl. source policy + offline tools).
    # Seed loadout context so arsenal chat still sees what the overlay is looking at.
    outbound = list(messages)
    if loadout_context.strip():
        outbound = [
            {
                "role": "user",
                "content": (
                    "[Overlay loadout context — use for build advice]\n"
                    + loadout_context.strip()
                ),
            },
            {
                "role": "assistant",
                "content": (
                    "Understood. I'll use that overlay loadout context and follow "
                    "source policy (offline facts; Overframe / YouTube / agent-calculated builds)."
                ),
            },
            *messages,
        ]
    data = _post_json(
        cfg.chat_api_url,
        {"messages": outbound},
        headers=headers,
    )
    if isinstance(data.get("error"), str) and data["error"]:
        raise ChatClientError(data["error"])
    message = data.get("message") or {}
    content = (message.get("content") or data.get("content") or "").strip()
    if not content:
        raise ChatClientError(f"Web chat returned no message: {data!r}")
    return content


def _post_json(url: str, body: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ChatClientError(f"Chat HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise ChatClientError(f"Chat request failed: {exc.reason}") from exc
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ChatClientError(f"Chat response was not JSON: {raw[:240]}") from exc
    if not isinstance(parsed, dict):
        raise ChatClientError("Chat response JSON must be an object.")
    return parsed
