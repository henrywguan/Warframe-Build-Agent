export const DESKTOP_SHELL_KEY = "wfba_desktop_shell_v1";
export const DESKTOP_MQ = "(min-width: 861px)";

export type DesktopPanelId = "history" | "builds";

export type DesktopPanelLayout = {
  w: number;
  /** Pixel height. Null stretches to the workspace. */
  h: number | null;
  minimized: boolean;
};

export type DesktopShellState = {
  history: DesktopPanelLayout;
  builds: DesktopPanelLayout;
};

export const HISTORY_MIN_W = 200;
export const BUILDS_MIN_W = 220;
export const PANEL_MAX_W = 440;
export const PANEL_MIN_H = 220;

export const DEFAULT_DESKTOP_SHELL: DesktopShellState = {
  history: { w: 248, h: null, minimized: false },
  builds: { w: 304, h: null, minimized: false },
};

function asFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function clampPanelWidth(width: number, minW: number, maxW = PANEL_MAX_W): number {
  return Math.min(maxW, Math.max(minW, Math.round(width)));
}

export function clampPanelHeight(
  height: number,
  viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight,
): number {
  const maxH = Math.max(PANEL_MIN_H, viewportHeight - 24);
  return Math.min(maxH, Math.max(PANEL_MIN_H, Math.round(height)));
}

export function parseDesktopShell(raw: unknown): DesktopShellState {
  const fallback = DEFAULT_DESKTOP_SHELL;
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Partial<DesktopShellState>;
  return {
    history: parsePanel(obj.history, fallback.history, HISTORY_MIN_W),
    builds: parsePanel(obj.builds, fallback.builds, BUILDS_MIN_W),
  };
}

function parsePanel(
  value: unknown,
  fallback: DesktopPanelLayout,
  minW: number,
): DesktopPanelLayout {
  if (!value || typeof value !== "object") return fallback;
  const row = value as Partial<DesktopPanelLayout>;
  const w = asFinite(row.w);
  const h = row.h === null ? null : asFinite(row.h);
  return {
    w: w == null ? fallback.w : clampPanelWidth(w, minW),
    h: h == null ? fallback.h : clampPanelHeight(h),
    minimized: Boolean(row.minimized),
  };
}

export function loadDesktopShell(): DesktopShellState {
  if (typeof window === "undefined") return DEFAULT_DESKTOP_SHELL;
  try {
    const raw = window.localStorage.getItem(DESKTOP_SHELL_KEY);
    if (!raw) return DEFAULT_DESKTOP_SHELL;
    return parseDesktopShell(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_DESKTOP_SHELL;
  }
}

export function saveDesktopShell(state: DesktopShellState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESKTOP_SHELL_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function desktopWorkspaceColumns(state: DesktopShellState): string {
  const history = state.history.minimized ? null : `${state.history.w}px`;
  const builds = state.builds.minimized ? null : `${state.builds.w}px`;
  return ["3.35rem", history, "minmax(0, 1fr)", builds].filter(Boolean).join(" ");
}
