from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QPoint, Qt
from PySide6.QtGui import QFont, QGuiApplication, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QComboBox,
    QFrame,
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
from ..models import Goal, LoadoutContext, WeaponSlot
from ..recommend import recommend_actions
from ..regions import load_regions, upsert_region
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
        self.resize(420, 640)
        self._drag_pos: QPoint | None = None
        self._selector: RegionSelector | None = None
        self._pending_region_name = "mod_grid"

        self._build_ui()
        self._load_style()
        self._wire_hotkeys()
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
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        header = QHBoxLayout()
        brand_box = QVBoxLayout()
        brand = QLabel("Warframe <span style='color:#3db8b0'>Build Agent</span>")
        brand.setObjectName("Brand")
        brand.setTextFormat(Qt.TextFormat.RichText)
        tagline = QLabel("Overlay · recommended actions for arsenal / mods")
        tagline.setObjectName("Tagline")
        brand_box.addWidget(brand)
        brand_box.addWidget(tagline)
        header.addLayout(brand_box, 1)

        self.pin_btn = QPushButton("Pinned")
        self.pin_btn.setObjectName("Ghost")
        self.pin_btn.setCheckable(True)
        self.pin_btn.setChecked(True)
        self.pin_btn.clicked.connect(self._toggle_pin)
        header.addWidget(self.pin_btn, 0, Qt.AlignmentFlag.AlignTop)

        close_btn = QPushButton("✕")
        close_btn.setObjectName("DangerGhost")
        close_btn.setFixedWidth(36)
        close_btn.clicked.connect(self.close)
        header.addWidget(close_btn, 0, Qt.AlignmentFlag.AlignTop)
        layout.addLayout(header)

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

        set_region_btn = QPushButton("Set region")
        set_region_btn.setObjectName("Ghost")
        set_region_btn.clicked.connect(self.begin_region_select)
        region_row.addWidget(set_region_btn)

        capture_btn = QPushButton("Capture")
        capture_btn.setObjectName("Ghost")
        capture_btn.clicked.connect(self.capture_region)
        region_row.addWidget(capture_btn)
        layout.addLayout(region_row)

        self.region_meta = QLabel()
        self.region_meta.setObjectName("Meta")
        self.region_meta.setWordWrap(True)
        layout.addWidget(self.region_meta)

        self.status_label = QLabel("Ready.")
        self.status_label.setObjectName("Hint")
        self.status_label.setWordWrap(True)
        layout.addWidget(self.status_label)

        action_row = QHBoxLayout()
        refresh_btn = QPushButton("Refresh actions")
        refresh_btn.setObjectName("Primary")
        refresh_btn.clicked.connect(self.refresh_actions)
        action_row.addWidget(refresh_btn, 2)

        hide_btn = QPushButton("Hide")
        hide_btn.setObjectName("Ghost")
        hide_btn.clicked.connect(self.showMinimized)
        action_row.addWidget(hide_btn, 1)
        layout.addLayout(action_row)

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

        hint = QLabel(
            "Hotkeys: Ctrl+Shift+A refresh · Ctrl+Shift+R set region · "
            "Ctrl+Shift+C capture · Ctrl+Shift+H show/hide"
        )
        hint.setObjectName("Hint")
        hint.setWordWrap(True)
        layout.addWidget(hint)

        policy = QLabel(
            "External only — separate window + desktop screenshots + your input. "
            "No Warframe process touch, memory access, injection, or game input. "
            "Reduces anti-cheat risk; cannot guarantee EAC false positives never happen. "
            "Verify: python3 -m wf_overlay --verify-external"
        )
        policy.setObjectName("Hint")
        policy.setWordWrap(True)
        layout.addWidget(policy)

    def _section(self, text: str) -> QLabel:
        label = QLabel(text)
        label.setObjectName("Section")
        return label

    def _load_style(self) -> None:
        qss = Path(__file__).resolve().parent.parent / "style.qss"
        if qss.exists():
            self.setStyleSheet(qss.read_text(encoding="utf-8"))
        font = QFont("Segoe UI", 10)
        self.setFont(font)

    def _wire_hotkeys(self) -> None:
        QShortcut(QKeySequence("Ctrl+Shift+A"), self, activated=self.refresh_actions)
        QShortcut(QKeySequence("Ctrl+Shift+R"), self, activated=self.begin_region_select)
        QShortcut(QKeySequence("Ctrl+Shift+C"), self, activated=self.capture_region)
        QShortcut(QKeySequence("Ctrl+Shift+H"), self, activated=self.toggle_visibility)

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
        else:
            self.showNormal()
            self.raise_()
            self.activateWindow()

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
                f"Set the “{name.replace('_', ' ')}” region first with Set region.",
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
                "No saved regions yet. Use Set region like a snipping tool on the arsenal mod grid."
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
