"""Minimizable in-overlay chat with the Warframe Build Agent."""

from __future__ import annotations

from PySide6.QtCore import QEvent, QObject, Qt, QThread, Signal
from PySide6.QtGui import QKeyEvent, QTextCursor
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QPlainTextEdit,
    QPushButton,
    QSizePolicy,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from ..chat_client import ChatClientError, send_chat
from ..chat_config import load_chat_settings, settings_help_text


class _ChatWorker(QThread):
    finished_ok = Signal(str)
    finished_err = Signal(str)

    def __init__(
        self,
        messages: list[dict[str, str]],
        loadout_context: str,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._messages = messages
        self._loadout_context = loadout_context

    def run(self) -> None:
        try:
            reply = send_chat(self._messages, loadout_context=self._loadout_context)
            self.finished_ok.emit(reply)
        except Exception as exc:  # noqa: BLE001 — surface any chat failure in UI
            self.finished_err.emit(str(exc))


class ChatPanel(QFrame):
    """Collapsible chat box embedded in the overlay."""

    visibilityChanged = Signal(bool)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("ChatPanel")
        self._messages: list[dict[str, str]] = []
        self._worker: _ChatWorker | None = None
        self._loadout_provider = lambda: ""
        self._expanded = True
        self._build_ui()
        self._append_assistant(
            "Tenno. Arsenal uplink online. Ask for builds, comparisons, or Steel Path "
            "advice while you play. Minimize anytime — Ctrl+Shift+T."
        )

    def set_loadout_provider(self, provider) -> None:  # noqa: ANN001
        self._loadout_provider = provider

    def is_expanded(self) -> bool:
        return self._expanded

    def set_expanded(self, expanded: bool) -> None:
        if expanded == self._expanded:
            return
        self._expanded = expanded
        self.body.setVisible(expanded)
        self.minimize_btn.setText("Minimize" if expanded else "Expand")
        self.visibilityChanged.emit(expanded)
        if expanded:
            self.input.setFocus()

    def toggle_expanded(self) -> None:
        self.set_expanded(not self._expanded)

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(8)

        header = QHBoxLayout()
        title = QLabel("Agent chat")
        title.setObjectName("Section")
        header.addWidget(title, 1)

        self.minimize_btn = QPushButton("Minimize")
        self.minimize_btn.setObjectName("Ghost")
        self.minimize_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.minimize_btn.clicked.connect(self.toggle_expanded)
        header.addWidget(self.minimize_btn)

        clear_btn = QPushButton("Clear")
        clear_btn.setObjectName("Ghost")
        clear_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        clear_btn.clicked.connect(self.clear_chat)
        header.addWidget(clear_btn)
        root.addLayout(header)

        self.body = QWidget()
        body_layout = QVBoxLayout(self.body)
        body_layout.setContentsMargins(0, 0, 0, 0)
        body_layout.setSpacing(8)

        self.transcript = QTextEdit()
        self.transcript.setObjectName("ChatTranscript")
        self.transcript.setReadOnly(True)
        self.transcript.setMinimumHeight(160)
        self.transcript.setSizePolicy(
            QSizePolicy.Policy.Expanding,
            QSizePolicy.Policy.Expanding,
        )
        body_layout.addWidget(self.transcript, 1)

        composer = QHBoxLayout()
        self.input = QPlainTextEdit()
        self.input.setObjectName("ChatInput")
        self.input.setPlaceholderText("Ask the Build Agent… (Enter to send, Shift+Enter for newline)")
        self.input.setFixedHeight(64)
        composer.addWidget(self.input, 1)

        self.send_btn = QPushButton("Send")
        self.send_btn.setObjectName("Primary")
        self.send_btn.setMinimumHeight(64)
        self.send_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.send_btn.clicked.connect(self.send_current)
        composer.addWidget(self.send_btn)
        body_layout.addLayout(composer)

        self.status = QLabel(self._config_status())
        self.status.setObjectName("Hint")
        self.status.setWordWrap(True)
        body_layout.addWidget(self.status)

        root.addWidget(self.body, 1)
        self.input.installEventFilter(_EnterToSendFilter(self.send_current, self.input))

    def _config_status(self) -> str:
        settings = load_chat_settings()
        if settings.configured:
            if settings.chat_api_url:
                return f"Using web chat API · {settings.chat_api_url}"
            return f"Using {settings.model} · ready"
        return settings_help_text().split("\n", 1)[0]

    def clear_chat(self) -> None:
        self._messages.clear()
        self.transcript.clear()
        self._append_assistant("Chat cleared. Ask another build or comparison question.")

    def send_current(self) -> None:
        text = self.input.toPlainText().strip()
        if not text or (self._worker and self._worker.isRunning()):
            return
        if not load_chat_settings().configured:
            self.status.setText(settings_help_text())
            self._append_assistant(settings_help_text())
            return

        self.input.clear()
        self._append_user(text)
        self._messages.append({"role": "user", "content": text})
        self.send_btn.setEnabled(False)
        self.status.setText("Thinking…")

        self._worker = _ChatWorker(list(self._messages), self._loadout_provider(), self)
        self._worker.finished_ok.connect(self._on_reply)
        self._worker.finished_err.connect(self._on_error)
        self._worker.start()

    def _on_reply(self, reply: str) -> None:
        self._messages.append({"role": "assistant", "content": reply})
        self._append_assistant(reply)
        self.send_btn.setEnabled(True)
        self.status.setText(self._config_status())

    def _on_error(self, error: str) -> None:
        self._append_assistant(f"Chat error: {error}")
        self.send_btn.setEnabled(True)
        self.status.setText(error)

    def _append_user(self, text: str) -> None:
        self._append_html(
            f'<p style="margin:8px 0 2px; color:#7fe7ef; letter-spacing:0.12em;">'
            f"<b>OPERATOR</b></p>"
            f'<p style="margin:0 0 10px; white-space:pre-wrap; color:#e8eef5;">'
            f"{_escape(text)}</p>"
        )

    def _append_assistant(self, text: str) -> None:
        self._append_html(
            f'<p style="margin:8px 0 2px; color:#d7b56d; letter-spacing:0.12em;">'
            f"<b>AGENT</b></p>"
            f'<p style="margin:0 0 10px; white-space:pre-wrap; color:#e8eef5;">'
            f"{_escape(text)}</p>"
        )

    def _append_html(self, html: str) -> None:
        cursor = self.transcript.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)
        self.transcript.setTextCursor(cursor)
        self.transcript.insertHtml(html)
        self.transcript.verticalScrollBar().setValue(
            self.transcript.verticalScrollBar().maximum()
        )


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br>")
    )


class _EnterToSendFilter(QObject):
    """Enter sends; Shift+Enter inserts a newline."""

    def __init__(self, on_send, parent: QObject | None = None) -> None:  # noqa: ANN001
        super().__init__(parent)
        self._on_send = on_send

    def eventFilter(self, watched: QObject, event: QEvent) -> bool:  # noqa: N802
        if event.type() != QEvent.Type.KeyPress:
            return False
        key_event = event
        if not isinstance(key_event, QKeyEvent):
            return False
        if key_event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            if key_event.modifiers() & Qt.KeyboardModifier.ShiftModifier:
                return False
            self._on_send()
            return True
        return False
