from __future__ import annotations

from PySide6.QtCore import QPoint, QRect, Qt, Signal
from PySide6.QtGui import QColor, QGuiApplication, QPainter, QPen
from PySide6.QtWidgets import QWidget

from ..models import ScreenRegion


class RegionSelector(QWidget):
    """Fullscreen dimmed selector; drag a rectangle, emit a ScreenRegion."""

    regionSelected = Signal(object)
    cancelled = Signal()

    def __init__(self, region_name: str, parent=None) -> None:
        super().__init__(parent)
        self.region_name = region_name
        self.origin: QPoint | None = None
        self.current: QPoint | None = None

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setWindowState(Qt.WindowState.WindowFullScreen)
        self.setCursor(Qt.CursorShape.CrossCursor)

        # Cover the virtual desktop as well as possible.
        screens = QGuiApplication.screens()
        if screens:
            bounds = screens[0].geometry()
            for screen in screens[1:]:
                bounds = bounds.united(screen.geometry())
            self.setGeometry(bounds)

    def paintEvent(self, event) -> None:  # noqa: N802
        del event
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor(10, 16, 20, 140))

        if self.origin and self.current:
            rect = QRect(self.origin, self.current).normalized()
            painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_Clear)
            painter.fillRect(rect, Qt.GlobalColor.transparent)
            painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceOver)
            pen = QPen(QColor(61, 184, 176, 230), 2)
            painter.setPen(pen)
            painter.drawRect(rect)
            painter.setPen(QColor(244, 248, 250, 230))
            painter.drawText(
                rect.adjusted(8, 8, -8, -8),
                Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft,
                f"{self.region_name}: {rect.width()}×{rect.height()}",
            )

        painter.setPen(QColor(232, 238, 242, 210))
        painter.drawText(
            self.rect().adjusted(24, 24, -24, -24),
            Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft,
            "Drag to select arsenal region  ·  Esc to cancel",
        )

    def mousePressEvent(self, event) -> None:  # noqa: N802
        if event.button() == Qt.MouseButton.LeftButton:
            self.origin = event.position().toPoint()
            self.current = self.origin
            self.update()

    def mouseMoveEvent(self, event) -> None:  # noqa: N802
        if self.origin is not None:
            self.current = event.position().toPoint()
            self.update()

    def mouseReleaseEvent(self, event) -> None:  # noqa: N802
        if event.button() != Qt.MouseButton.LeftButton or not self.origin:
            return
        self.current = event.position().toPoint()
        rect = QRect(self.origin, self.current).normalized()
        if rect.width() < 8 or rect.height() < 8:
            self.cancelled.emit()
            self.close()
            return

        # Map widget-local coords to global screen coords.
        top_left = self.mapToGlobal(rect.topLeft())
        region = ScreenRegion(
            name=self.region_name,
            left=top_left.x(),
            top=top_left.y(),
            width=rect.width(),
            height=rect.height(),
        )
        self.regionSelected.emit(region)
        self.close()

    def keyPressEvent(self, event) -> None:  # noqa: N802
        if event.key() == Qt.Key.Key_Escape:
            self.cancelled.emit()
            self.close()
