"""Overlay chat client: mocked HTTPS replies without a real API key."""

from __future__ import annotations

import unittest
from unittest import mock

from wf_overlay.chat_client import ChatClientError, send_chat
from wf_overlay.chat_config import ChatSettings


class ChatClientTests(unittest.TestCase):
    def test_unconfigured_raises_helpful_error(self) -> None:
        with self.assertRaises(ChatClientError) as ctx:
            send_chat(
                [{"role": "user", "content": "hi"}],
                settings=ChatSettings(),
            )
        self.assertIn("OPENAI_API_KEY", str(ctx.exception))

    def test_openai_compatible_reply(self) -> None:
        settings = ChatSettings(api_key="sk-test", model="gpt-test")
        fake = {
            "choices": [
                {"message": {"content": "Operator, viral + heat is the practical SP route."}}
            ]
        }
        with mock.patch("wf_overlay.chat_client._post_json", return_value=fake) as post:
            text = send_chat(
                [{"role": "user", "content": "Coda Hema SP ideas?"}],
                loadout_context="weapon/frame: Coda Hema\nslot: primary\ngoal: steel_path",
                settings=settings,
            )
        self.assertIn("viral", text.lower())
        self.assertTrue(post.called)
        args, kwargs = post.call_args
        url = args[0]
        body = args[1]
        self.assertIn("/chat/completions", url)
        self.assertEqual(body["model"], "gpt-test")
        self.assertEqual(body["messages"][-1]["content"], "Coda Hema SP ideas?")
        self.assertEqual(body["messages"][0]["role"], "system")

    def test_web_api_reply_path(self) -> None:
        settings = ChatSettings(chat_api_url="http://127.0.0.1:3000/api/chat")
        fake = {
            "message": {"role": "assistant", "content": "Slash-free reply from web chat."},
            "toolsUsed": [],
        }
        with mock.patch("wf_overlay.chat_client._post_json", return_value=fake) as post:
            text = send_chat(
                [{"role": "user", "content": "hello"}],
                settings=settings,
            )
        self.assertEqual(text, "Slash-free reply from web chat.")
        self.assertEqual(post.call_args.args[0], "http://127.0.0.1:3000/api/chat")

    def test_empty_model_content_errors(self) -> None:
        settings = ChatSettings(api_key="sk-test")
        with mock.patch(
            "wf_overlay.chat_client._post_json",
            return_value={"choices": [{"message": {"content": "   "}}]},
        ):
            with self.assertRaises(ChatClientError):
                send_chat([{"role": "user", "content": "hi"}], settings=settings)


if __name__ == "__main__":
    unittest.main()
