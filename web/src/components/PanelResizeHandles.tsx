"use client";

import { useRef, type PointerEvent } from "react";
import styles from "./PanelResizeHandles.module.css";

export type PanelSize = {
  w: number;
  h: number | null;
};

type Edge = "east" | "west" | "corner";

export function PanelResizeHandles({
  edges,
  size,
  minW,
  maxW,
  minH,
  onChange,
}: {
  edges: Edge[];
  size: PanelSize;
  minW: number;
  maxW: number;
  minH: number;
  onChange: (next: PanelSize) => void;
}) {
  const dragRef = useRef<{
    pointerId: number;
    edge: Edge;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  function begin(event: PointerEvent<HTMLDivElement>, edge: Edge) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const fallbackH =
      event.currentTarget.parentElement?.getBoundingClientRect().height ??
      size.h ??
      minH;
    dragRef.current = {
      pointerId: event.pointerId,
      edge,
      startX: event.clientX,
      startY: event.clientY,
      origW: size.w,
      origH: size.h ?? fallbackH,
    };
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const maxH = Math.max(minH, window.innerHeight - 24);
    let w = drag.origW;
    let h = drag.origH;
    if (drag.edge === "east" || drag.edge === "corner") w = drag.origW + dx;
    if (drag.edge === "west") w = drag.origW - dx;
    if (drag.edge === "corner") h = drag.origH + dy;
    onChange({
      w: Math.min(maxW, Math.max(minW, Math.round(w))),
      h:
        drag.edge === "corner"
          ? Math.min(maxH, Math.max(minH, Math.round(h)))
          : size.h,
    });
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
  }

  return (
    <>
      {edges.includes("east") ? (
        <div
          className={`${styles.handle} ${styles.east}`}
          onPointerDown={(event) => begin(event, "east")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-hidden="true"
        />
      ) : null}
      {edges.includes("west") ? (
        <div
          className={`${styles.handle} ${styles.west}`}
          onPointerDown={(event) => begin(event, "west")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-hidden="true"
        />
      ) : null}
      {edges.includes("corner") ? (
        <div
          className={`${styles.handle} ${styles.corner}`}
          onPointerDown={(event) => begin(event, "corner")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}
