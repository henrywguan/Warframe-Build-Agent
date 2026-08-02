from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QPoint, Qt
from PySide6.QtGui import QFont, QFontDatabase, QGuiApplication, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from ..capture import capture_saved_region
from ..hotkeys import HOTKEY_BINDINGS, GlobalHotkeyManager, describe_hotkeys
from ..models import Goal, LoadoutContext, WeaponSlot
from ..recommend import recommend_actions
from ..regions import load_regions, upsert_region
from .chat_panel import ChatPanel
from .region_selector import RegionSelector


class OverlayWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setObjectName("OverlayRoot")
        self.setWindowTitle("Warframe Build Agent Overlay")
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.resize(460, 820)
        self._drag_pos: QPoint | None = None
        self._selector: RegionSelector | None = None
        self._pending_region_name = "mod_grid"
        self._hotkeys = GlobalHotkeyManager(self)
        self._action_buttons: dict[str, QPushButton] = {}
        self.chat_panel: ChatPanel | None = None

        self._build_ui()
        self._load_style()
        self._wire_local_shortcuts()
        self._wire_global_hotkeys()
        self._refresh_region_meta()
        self._place_default()
        self.refresh_actions()

    def _build_ui(self) -> None:
        shell = QWidget()
        shell.setObjectName("OverlayRoot")
        self.setCentralWidget(shell)
        root = QVBoxLayout(shell)
        root.setContentsMargins(10, 10, 10, 10)

        panel = QFrame()
        panel.setObjectName("Panel")
        root.addWidget(panel)
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        header = QHBoxLayout()
        brand_box = QVBoxLayout()
        brand = QLabel(
            "WARFRAME <span style='color:#7fe7ef'>BUILD AGENT</span>"
        )
        brand.setObjectName("Brand")
        brand.setTextFormat(Qt.TextFormat.RichText)
        tagline = QLabel("ARSENAL OVERLAY  ·  ACTIONS  ·  LIVE AGENT CHAT")
        tagline.setObjectName("Tagline")
        brand_box.addWidget(brand)
        brand_box.addWidget(tagline)
        header.addLayout(brand_box, 1)

        self.pin_btn = QPushButton("Pinned")
        self.pin_btn.setObjectName("Ghost")
        self.pin_btn.setCheckable(True)
        self.pin_btn.setChecked(True)
        self.pin_btn.setToolTip("Keep the overlay above other windows")
        self.pin_btn.clicked.connect(self._toggle_pin)
        header.addWidget(self.pin_btn, 0, Qt.AlignmentFlag.AlignTop)

        close_btn = QPushButton("✕")
        close_btn.setObjectName("DangerGhost")
        close_btn.setFixedWidth(36)
        close_btn.setToolTip("Close overlay")
        close_btn.clicked.connect(self.close)
        header.addWidget(close_btn, 0, Qt.AlignmentFlag.AlignTop)
        layout.addLayout(header)

        header_rule = QFrame()
        header_rule.setObjectName("HeaderRule")
        layout.addWidget(header_rule)

        layout.addWidget(self._section("Quick actions"))
        layout.addLayout(self._build_quick_actions())

        self.global_hotkeys_box = QCheckBox("Enable global hotkeys (Windows)")
        self.global_hotkeys_box.setChecked(self._hotkeys.supported)
        self.global_hotkeys_box.setToolTip(
            "OS-registered hotkeys (RegisterHotKey). Works while Warframe is focused. "
            "Not a low-level keyboard hook and does not type into the game."
        )
        self.global_hotkeys_box.toggled.connect(self._on_global_hotkeys_toggled)
        layout.addWidget(self.global_hotkeys_box)

        layout.addWidget(self._section("Loadout"))
        form = QHBoxLayout()
        self.weapon_input = QLineEdit()
        self.weapon_input.setPlaceholderText("Weapon / Warframe name")
        self.weapon_input.returnPressed.connect(self.refresh_actions)
        form.addWidget(self.weapon_input, 2)

        self.slot_combo = QComboBox()
        for slot in WeaponSlot:
            self.slot_combo.addItem(slot.value.replace("_", " ").title(), slot)
        self.slot_combo.currentIndexChanged.connect(self.refresh_actions)
        form.addWidget(self.slot_combo, 1)
        layout.addLayout(form)

        goal_row = QHBoxLayout()
        self.goal_combo = QComboBox()
        self.goal_combo.addItem("Steel Path", Goal.STEEL_PATH)
        self.goal_combo.addItem("Max damage", Goal.MAX_DAMAGE)
        self.goal_combo.addItem("Endgame", Goal.ENDGAME)
        self.goal_combo.currentIndexChanged.connect(self.refresh_actions)
        goal_row.addWidget(self.goal_combo, 1)

        self.notes_input = QLineEdit()
        self.notes_input.setPlaceholderText("Notes: ammo, energy, range…")
        self.notes_input.returnPressed.connect(self.refresh_actions)
        goal_row.addWidget(self.notes_input, 2)
        layout.addLayout(goal_row)

        layout.addWidget(self._section("Screen regions"))
        region_row = QHBoxLayout()
        self.region_combo = QComboBox()
        self.region_combo.addItem("Mod grid", "mod_grid")
        self.region_combo.addItem("Stats panel", "stats_panel")
        region_row.addWidget(self.region_combo, 1)
        layout.addLayout(region_row)

        self.region_meta = QLabel()
        self.region_meta.setObjectName("Meta")
        self.region_meta.setWordWrap(True)
        layout.addWidget(self.region_meta)

        self.status_label = QLabel("Ready.")
        self.status_label.setObjectName("Hint")
        self.status_label.setWordWrap(True)
        layout.addWidget(self.status_label)

        layout.addWidget(self._section("Recommended actions"))
        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.actions_host = QWidget()
        self.actions_layout = QVBoxLayout(self.actions_host)
        self.actions_layout.setContentsMargins(0, 0, 0, 0)
        self.actions_layout.setSpacing(8)
        self.actions_layout.addStretch(1)
        self.scroll.setWidget(self.actions_host)
        layout.addWidget(self.scroll, 1)

        self.chat_panel = ChatPanel()
        self.chat_panel.set_loadout_provider(self._loadout_context_text)
        layout.addWidget(self.chat_panel, 1)

        hint = QLabel(f"Hotkeys: {describe_hotkeys()}")
        hint.setObjectName("Hint")
        hint.setWordWrap(True)
        layout.addWidget(hint)

        policy = QLabel(
            "External only — buttons + desktop screenshots + optional OS global hotkeys + chat API. "
            "No Warframe process touch, memory access, injection, or game input. "
            "Verify: python3 -m wf_overlay --verify-external"
        )
        policy.setObjectName("Hint")
        policy.setWordWrap(True)
        layout.addWidget(policy)

    def _build_quick_actions(self) -> QGridLayout:
        grid = QGridLayout()
        grid.setHorizontalSpacing(8)
        grid.setVerticalSpacing(8)

        specs = [
            ("refresh", "Refresh actions", "Primary", self.refresh_actions, 0, 0),
            ("set_region", "Set region", "Action", self.begin_region_select, 0, 1),
            ("capture", "Capture", "Action", self.capture_region, 1, 0),
            ("toggle", "Show / hide", "Ghost", self.toggle_visibility, 1, 1),
            ("chat", "Chat panel", "Action", self.toggle_chat, 2, 0),
        ]
        chord_by_id = {b.action_id: b.chord for b in HOTKEY_BINDINGS}

        for action_id, title, role, callback, row, col in specs:
            button = QPushButton(f"{title}\n{chord_by_id.get(action_id, '')}")
            button.setObjectName(role)
            button.setMinimumHeight(58)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.setToolTip(f"{title} ({chord_by_id.get(action_id, 'click')})")
            button.clicked.connect(callback)
            self._action_buttons[action_id] = button
            span = 2 if action_id == "chat" else 1
            grid.addWidget(button, row, col, 1, span)
        return grid

    def _section(self, text: str) -> QLabel:
        label = QLabel(text)
        label.setObjectName("Section")
        return label

    def _load_style(self) -> None:
        qss = Path(__file__).resolve().parent.parent / "style.qss"
        if qss.exists():
            self.setStyleSheet(qss.read_text(encoding="utf-8"))
        families = set(QFontDatabase.families())
        if "Rajdhani" in families:
            font = QFont("Rajdhani", 11)
        elif "Orbitron" in families:
            font = QFont("Orbitron", 10)
        else:
            font = QFont("Segoe UI Semibold", 10)
        self.setFont(font)

    def _wire_local_shortcuts(self) -> None:
        # Fallback when the overlay itself is focused (all platforms).
        QShortcut(QKeySequence("Ctrl+Shift+A"), self, activated=self.refresh_actions)
        QShortcut(QKeySequence("Ctrl+Shift+R"), self, activated=self.begin_region_select)
        QShortcut(QKeySequence("Ctrl+Shift+C"), self, activated=self.capture_region)
        QShortcut(QKeySequence("Ctrl+Shift+H"), self, activated=self.toggle_visibility)
        QShortcut(QKeySequence("Ctrl+Shift+T"), self, activated=self.toggle_chat)

    def _wire_global_hotkeys(self) -> None:
        self._hotkeys.triggered.connect(self._on_hotkey_action)
        self._hotkeys.statusChanged.connect(self._set_status)
        if self.global_hotkeys_box.isChecked():
            started = self._hotkeys.start()
            if not started:
                self.global_hotkeys_box.setChecked(False)

    def _on_global_hotkeys_toggled(self, checked: bool) -> None:
        if checked:
            if not self._hotkeys.start():
                self.global_hotkeys_box.blockSignals(True)
                self.global_hotkeys_box.setChecked(False)
                self.global_hotkeys_box.blockSignals(False)
        else:
            self._hotkeys.stop()

    def _on_hotkey_action(self, action_id: str) -> None:
        dispatch = {
            "refresh": self.refresh_actions,
            "set_region": self.begin_region_select,
            "capture": self.capture_region,
            "toggle": self.toggle_visibility,
            "chat": self.toggle_chat,
        }
        action = dispatch.get(action_id)
        if action:
            action()

    def closeEvent(self, event) -> None:  # noqa: N802
        self._hotkeys.stop()
        super().closeEvent(event)

    def _place_default(self) -> None:
        screen = QGuiApplication.primaryScreen()
        if not screen:
            return
        geo = screen.availableGeometry()
        self.move(geo.right() - self.width() - 24, geo.top() + 48)

    def _toggle_pin(self) -> None:
        pinned = self.pin_btn.isChecked()
        self.pin_btn.setText("Pinned" if pinned else "Unpinned")
        flags = self.windowFlags()
        if pinned:
            flags |= Qt.WindowType.WindowStaysOnTopHint
        else:
            flags &= ~Qt.WindowType.WindowStaysOnTopHint
        self.setWindowFlags(flags)
        self.show()

    def toggle_visibility(self) -> None:
        if self.isVisible() and not self.isMinimized():
            self.showMinimized()
            self._set_status("Overlay hidden. Hotkey or taskbar to bring it back.")
        else:
            self.showNormal()
            self.raise_()
            self.activateWindow()
            self._set_status("Overlay shown.")

    def toggle_chat(self) -> None:
        if not self.chat_panel:
            return
        self.showNormal()
        self.raise_()
        self.activateWindow()
        self.chat_panel.toggle_expanded()
        state = "expanded" if self.chat_panel.is_expanded() else "minimized"
        self._set_status(f"Chat panel {state}.")

    def _loadout_context_text(self) -> str:
        ctx = self._context()
        bits = [
            f"weapon/frame: {ctx.weapon_name or '(unset)'}",
            f"slot: {ctx.slot.value}",
            f"goal: {ctx.goal.value}",
        ]
        if ctx.notes:
            bits.append(f"notes: {ctx.notes}")
        return "\n".join(bits)

    def begin_region_select(self) -> None:
        self._pending_region_name = self.region_combo.currentData()
        self.showMinimized()
        self._selector = RegionSelector(self._pending_region_name)
        self._selector.regionSelected.connect(self._on_region_selected)
        self._selector.cancelled.connect(self._on_region_cancelled)
        self._selector.showFullScreen()

    def _on_region_selected(self, region) -> None:
        upsert_region(region)
        self._refresh_region_meta()
        self.showNormal()
        self.raise_()
        self.activateWindow()
        self._set_status(f"Saved region “{region.name}” ({region.width}×{region.height}).")

    def _on_region_cancelled(self) -> None:
        self.showNormal()
        self.raise_()
        self.activateWindow()
        self._set_status("Region select cancelled.")

    def capture_region(self) -> None:
        name = self.region_combo.currentData()
        regions = load_regions()
        region = regions.get(name)
        if not region:
            QMessageBox.information(
                self,
                "No region yet",
                f"Click “Set region” first and drag over the {name.replace('_', ' ')}.",
            )
            return
        try:
            path = capture_saved_region(region)
        except Exception as exc:  # noqa: BLE001
            QMessageBox.warning(self, "Capture failed", str(exc))
            return
        self._set_status(f"Captured {name} → {path}")

    def _refresh_region_meta(self) -> None:
        regions = load_regions()
        if not regions:
            self.region_meta.setText(
                "No saved regions yet. Click Set region, then drag over the arsenal mod grid."
            )
            return
        bits = [
            f"{name}: {r.width}×{r.height} @ ({r.left},{r.top})"
            for name, r in regions.items()
        ]
        self.region_meta.setText("Saved · " + " · ".join(bits))

    def _context(self) -> LoadoutContext:
        return LoadoutContext(
            weapon_name=self.weapon_input.text().strip(),
            slot=self.slot_combo.currentData(),
            goal=self.goal_combo.currentData(),
            notes=self.notes_input.text().strip(),
            detected_mods=[],
        )

    def refresh_actions(self) -> None:
        actions = recommend_actions(self._context())
        while self.actions_layout.count() > 1:
            item = self.actions_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

        for index, action in enumerate(actions, start=1):
            self.actions_layout.insertWidget(index - 1, self._action_card(index, action))

        weapon = self.weapon_input.text().strip() or "current loadout"
        self._set_status(f"{len(actions)} actions for {weapon}.")

    def _action_card(self, index: int, action) -> QFrame:
        card = QFrame()
        card.setObjectName("ActionCard")
        card.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Maximum)
        box = QVBoxLayout(card)
        box.setContentsMargins(12, 10, 12, 10)
        box.setSpacing(4)

        top = QHBoxLayout()
        priority = QLabel(f"{index:02d}")
        priority.setObjectName("ActionPriority")
        top.addWidget(priority)
        category = QLabel(action.category)
        category.setObjectName("ActionCategory")
        top.addWidget(category)
        top.addStretch(1)
        box.addLayout(top)

        title = QLabel(action.title)
        title.setObjectName("ActionTitle")
        title.setWordWrap(True)
        box.addWidget(title)

        detail = QLabel(action.detail)
        detail.setObjectName("ActionDetail")
        detail.setWordWrap(True)
        box.addWidget(detail)

        if action.why:
            why = QLabel(action.why)
            why.setObjectName("ActionWhy")
            why.setWordWrap(True)
            box.addWidget(why)
        return card

    def _set_status(self, text: str) -> None:
        self.status_label.setText(text)

    def mousePressEvent(self, event) -> None:  # noqa: N802
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_pos = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event) -> None:  # noqa: N802
        if self._drag_pos is not None and event.buttons() & Qt.MouseButton.LeftButton:
            self.move(event.globalPosition().toPoint() - self._drag_pos)
            event.accept()

    def mouseReleaseEvent(self, event) -> None:  # noqa: N802
        del event
        self._drag_pos = None
