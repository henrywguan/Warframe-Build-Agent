"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BuildFolder,
  GearSlot,
  GearSlotKey,
  SavedBuild,
  SavedBuildsMemory,
} from "../lib/saved-builds";
import {
  BUILD_FOCUS_LABELS,
  BUILD_FOCUS_SLOTS,
  addBuild,
  addFolder,
  buildsInFolder,
  createEmptyBuild,
  deleteBuild,
  deleteFolder,
  inferFocusSlot,
  renameBuild,
  renameFolder,
  updateBuild,
} from "../lib/saved-builds";
import { BUILDS_MIN_W, PANEL_MAX_W, PANEL_MIN_H } from "../lib/desktop-shell";
import suggestPack from "../data/offline-suggest.json";
import { NameSuggestInput } from "./NameSuggestInput";
import { PanelResizeHandles } from "./PanelResizeHandles";
import styles from "./SavedBuildsPane.module.css";

type FolderFilter = "all" | "unfiled" | string;

/** Slot picker groups for the Uiverse-style add menu (Galahhad/old-falcon-43). */
const ADD_MENU_GROUPS: GearSlotKey[][] = [
  ["warframe"],
  ["primary", "secondary", "melee"],
  ["companion"],
];

function SlotGlyph({ slot }: { slot: GearSlotKey }) {
  const common = {
    className: styles.addGlyph,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (slot) {
    case "warframe":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.1" />
          <path d="M6.2 19.2v-1.1a5.8 5.8 0 0 1 11.6 0v1.1" />
        </svg>
      );
    case "primary":
      return (
        <svg {...common}>
          <path d="M3 14h11l6-3.2V9.5L14 12H8" />
          <path d="M8 12v4M12 12v3.2" />
        </svg>
      );
    case "secondary":
      return (
        <svg {...common}>
          <path d="M7 15.5V11l8.5-2.2 1.2 2.4-6.2 1.6v2.7" />
          <path d="M7 13.2H4.8" />
        </svg>
      );
    case "melee":
      return (
        <svg {...common}>
          <path d="M14.2 4.5 19.5 9.8 9.2 20.1H4.8v-4.4Z" />
          <path d="M12.4 6.3 17.7 11.6" />
        </svg>
      );
    case "companion":
      return (
        <svg {...common}>
          <circle cx="8" cy="9.2" r="1.35" />
          <circle cx="16" cy="9.2" r="1.35" />
          <circle cx="6.6" cy="13.4" r="1.2" />
          <circle cx="17.4" cy="13.4" r="1.2" />
          <ellipse cx="12" cy="16.2" rx="2.4" ry="2.1" />
        </svg>
      );
  }
}

const ITEM_DICTS = {
  warframe: suggestPack.items.warframe,
  primary: suggestPack.items.primary,
  secondary: suggestPack.items.secondary,
  melee: suggestPack.items.melee,
  companion: suggestPack.items.companion,
};

export function SavedBuildsPane({
  memory,
  onChange,
  selectedBuildId,
  onSelectBuild,
  filterFolderId,
  onFilterFolder,
  mobileOpen = false,
  onMobileClose,
  desktopHidden = false,
  onDesktopMinimize,
  desktopSize,
  onDesktopResize,
}: {
  memory: SavedBuildsMemory;
  onChange: (next: SavedBuildsMemory) => void;
  selectedBuildId: string | null;
  onSelectBuild: (id: string | null) => void;
  filterFolderId: FolderFilter;
  onFilterFolder: (id: FolderFilter) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  desktopHidden?: boolean;
  onDesktopMinimize?: () => void;
  desktopSize?: { w: number; h: number | null };
  onDesktopResize?: (next: { w: number; h: number | null }) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [focusNewId, setFocusNewId] = useState<string | null>(null);
  const addWrapRef = useRef<HTMLDivElement | null>(null);

  const visible = useMemo(() => {
    if (filterFolderId === "all") return buildsInFolder(memory, "all");
    if (filterFolderId === "unfiled") return buildsInFolder(memory, null);
    return buildsInFolder(memory, filterFolderId);
  }, [memory, filterFolderId]);

  const grouped = useMemo(() => {
    const buckets: Record<string, SavedBuild[]> = {
      warframe: [],
      primary: [],
      secondary: [],
      melee: [],
      companion: [],
      full: [],
    };
    for (const build of visible) {
      buckets[inferFocusSlot(build)]?.push(build);
    }
    return buckets;
  }, [visible]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!addWrapRef.current?.contains(event.target as Node)) setAddOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAddOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function handleAddSlot(slot: GearSlotKey) {
    const folderId =
      filterFolderId === "all" || filterFolderId === "unfiled"
        ? null
        : filterFolderId;
    const build = createEmptyBuild({
      folderId,
      focusSlot: slot,
      name: `New ${BUILD_FOCUS_LABELS[slot]}`,
    });
    onChange(addBuild(memory, build));
    onSelectBuild(build.id);
    setFocusNewId(build.id);
    setAddOpen(false);
  }

  function handleRemove() {
    if (selectedBuildId) {
      onChange(deleteBuild(memory, selectedBuildId));
      onSelectBuild(null);
      return;
    }
    if (visible[0]) {
      onChange(deleteBuild(memory, visible[0].id));
    }
  }

  function handleAddFolder() {
    const next = addFolder(memory, "New folder");
    const created = next.folders[next.folders.length - 1];
    onChange(next);
    if (created) onFilterFolder(created.id);
  }

  function handleDeleteFolder(folderId: string) {
    onChange(deleteFolder(memory, folderId));
    if (filterFolderId === folderId) onFilterFolder("all");
  }

  const sectionOrder = [...BUILD_FOCUS_SLOTS, "full"] as const;

  return (
    <div
      className={`${styles.rail} ${desktopHidden ? styles.railHidden : ""} ${
        desktopSize?.h ? styles.railShort : ""
      }`}
      data-open={mobileOpen ? "true" : "false"}
      style={
        desktopSize
          ? {
              ["--panel-h" as string]: desktopSize.h ? `${desktopSize.h}px` : "100%",
            }
          : undefined
      }
    >
      <div
        className={`${styles.backdrop} ${mobileOpen ? styles.backdropOpen : ""}`}
        role="presentation"
        onClick={onMobileClose}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={`${styles.pane} ${mobileOpen ? styles.paneOpen : ""}`}
        aria-label="Saved builds"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.label}>Arsenal</p>
            <h2 className={styles.title}>Saved Builds</h2>
          </div>
          <div className={styles.headerActions}>
            <div
              className={styles.addWrap}
              ref={addWrapRef}
              data-open={addOpen ? "true" : "false"}
            >
              <button
                type="button"
                className={styles.addTrigger}
                onClick={() => setAddOpen((open) => !open)}
                aria-label="Add build slot"
                aria-expanded={addOpen}
                aria-haspopup="menu"
                aria-controls="arsenal-add-menu"
                title="Add Warframe, Primary, Secondary, Melee, or Companion"
              >
                <span className={styles.addBars} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
              <nav
                id="arsenal-add-menu"
                className={styles.addMenu}
                aria-hidden={addOpen ? "false" : "true"}
              >
                <p className={styles.addLegend}>Add slot</p>
                <ul className={styles.addList} role="menu">
                  {ADD_MENU_GROUPS.map((group, groupIndex) => (
                    <li key={group[0]} className={styles.addGroup} role="none">
                      {groupIndex > 0 ? (
                        <div className={styles.addRule} role="separator" />
                      ) : null}
                      {group.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          role="menuitem"
                          className={styles.addMenuItem}
                          data-slot={slot}
                          tabIndex={addOpen ? 0 : -1}
                          onClick={() => handleAddSlot(slot)}
                        >
                          <SlotGlyph slot={slot} />
                          <span>{BUILD_FOCUS_LABELS[slot]}</span>
                        </button>
                      ))}
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleRemove}
              aria-label="Remove selected build"
              title="Remove build"
              disabled={!selectedBuildId && visible.length === 0}
            >
              −
            </button>
            {onDesktopMinimize ? (
              <button
                type="button"
                className={styles.chromeBtn}
                onClick={onDesktopMinimize}
                aria-label="Minimize saved builds"
                title="Minimize"
              >
                –
              </button>
            ) : null}
            {onMobileClose ? (
              <button
                type="button"
                className={styles.closeMobile}
                onClick={onMobileClose}
                aria-label="Close saved builds"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.folderBar}>
          <button
            type="button"
            className={`${styles.folderChip} ${filterFolderId === "all" ? styles.folderChipActive : ""}`}
            onClick={() => onFilterFolder("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`${styles.folderChip} ${filterFolderId === "unfiled" ? styles.folderChipActive : ""}`}
            onClick={() => onFilterFolder("unfiled")}
          >
            Unfiled
          </button>
          {memory.folders.map((folder) => (
            <FolderChip
              key={folder.id}
              folder={folder}
              active={filterFolderId === folder.id}
              onSelect={() => onFilterFolder(folder.id)}
              onRename={(name) => onChange(renameFolder(memory, folder.id, name))}
              onDelete={() => handleDeleteFolder(folder.id)}
            />
          ))}
          <button
            type="button"
            className={styles.folderAdd}
            onClick={handleAddFolder}
            aria-label="Add folder"
            title="Add folder"
          >
            + Folder
          </button>
        </div>

        <div className={styles.scroll}>
          {visible.length === 0 ? (
            <p className={styles.empty}>
              No builds here yet. Use <code>+</code> to pick Warframe, Primary,
              Secondary, Melee, or Companion — or <code>/save-build</code>.
            </p>
          ) : (
            sectionOrder.map((slot) => {
              const rows = grouped[slot] ?? [];
              if (!rows.length) return null;
              return (
                <section key={slot} className={styles.slotGroup}>
                  <h3 className={styles.slotHeading}>{BUILD_FOCUS_LABELS[slot]}</h3>
                  {rows.map((build) => (
                    <BuildCard
                      key={build.id}
                      build={build}
                      folders={memory.folders}
                      selected={build.id === selectedBuildId}
                      autoFocusName={focusNewId === build.id}
                      onSelect={() =>
                        onSelectBuild(build.id === selectedBuildId ? null : build.id)
                      }
                      onRename={(name) => onChange(renameBuild(memory, build.id, name))}
                      onPatch={(patch) => onChange(updateBuild(memory, build.id, patch))}
                    />
                  ))}
                </section>
              );
            })
          )}
        </div>

        <p className={styles.footnote}>
          Browser localStorage · double-click names to rename · mod names from the offline pack
        </p>
        {onDesktopResize && desktopSize ? (
          <PanelResizeHandles
            edges={["west", "corner"]}
            size={desktopSize}
            minW={BUILDS_MIN_W}
            maxW={PANEL_MAX_W}
            minH={PANEL_MIN_H}
            onChange={onDesktopResize}
          />
        ) : null}
      </aside>
    </div>
  );
}

function FolderChip({
  folder,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: BuildFolder;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(folder.name);
  }, [folder.name]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== folder.name) onRename(next);
    else setDraft(folder.name);
  }

  if (editing) {
    return (
      <span className={`${styles.folderChip} ${styles.folderChipActive}`}>
        <input
          ref={inputRef}
          className={styles.folderInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(folder.name);
              setEditing(false);
            }
          }}
          aria-label="Rename folder"
        />
      </span>
    );
  }

  return (
    <span className={`${styles.folderChip} ${active ? styles.folderChipActive : ""}`}>
      <button
        type="button"
        className={styles.folderChipBtn}
        onClick={onSelect}
        onDoubleClick={() => setEditing(true)}
      >
        {folder.name}
      </button>
      <button
        type="button"
        className={styles.folderDelete}
        aria-label={`Delete folder ${folder.name}`}
        title="Delete folder (builds become Unfiled)"
        onClick={onDelete}
      >
        ×
      </button>
    </span>
  );
}

function BuildCard({
  build,
  folders,
  selected,
  autoFocusName,
  onSelect,
  onRename,
  onPatch,
}: {
  build: SavedBuild;
  folders: BuildFolder[];
  selected: boolean;
  autoFocusName?: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onPatch: (patch: Partial<SavedBuild>) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(build.name);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const focus = inferFocusSlot(build);
  const slotsToShow: GearSlotKey[] =
    focus === "full" ? [...BUILD_FOCUS_SLOTS] : [focus];

  useEffect(() => {
    setDraftName(build.name);
  }, [build.name]);

  useEffect(() => {
    if (editingName) nameRef.current?.select();
  }, [editingName]);

  function commitName() {
    const next = draftName.trim();
    setEditingName(false);
    if (next && next !== build.name) onRename(next);
    else setDraftName(build.name);
  }

  return (
    <article
      className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
      data-selected={selected ? "true" : "false"}
      data-slot={focus}
      onClick={onSelect}
    >
      <div className={styles.cardHeader}>
        {editingName ? (
          <input
            ref={nameRef}
            className={styles.nameInput}
            value={draftName}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setDraftName(build.name);
                setEditingName(false);
              }
            }}
            aria-label="Rename build"
          />
        ) : (
          <button
            type="button"
            className={styles.cardTitle}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
            }}
          >
            {build.name}
          </button>
        )}
        <select
          className={styles.folderSelect}
          value={build.folderId ?? ""}
          aria-label="Move build to folder"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value;
            onPatch({ folderId: v ? v : null });
          }}
        >
          <option value="">Unfiled</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {slotsToShow.map((slot) => (
        <GearBlock
          key={slot}
          label={BUILD_FOCUS_LABELS[slot]}
          slot={build[slot]}
          itemNames={ITEM_DICTS[slot]}
          autoFocusName={autoFocusName && slot === slotsToShow[0]}
          onChange={(next) => onPatch({ [slot]: next })}
        />
      ))}

      {focus === "warframe" || focus === "full" ? (
        <div className={styles.section} onClick={(e) => e.stopPropagation()}>
          <p className={styles.sectionLabel}>Archon crystals</p>
          <textarea
            className={styles.listInput}
            rows={2}
            placeholder="Crimson Melee Crit, Amber Casting Speed…"
            value={build.archonCrystals
              .map((c) =>
                `${c.color}${c.tauforged ? " Tau" : ""} ${c.effect}`
                  .replace(/\s+/g, " ")
                  .trim(),
              )
              .join(", ")}
            onChange={(e) => {
              const parts = e.target.value
                .split(/[,;\n]+/)
                .map((s) => s.trim())
                .filter(Boolean);
              onPatch({
                archonCrystals: parts.map((entry) => {
                  const tauforged = /tau/i.test(entry);
                  const cleaned = entry.replace(/\btau(?:forged)?\b/gi, "").trim();
                  const colorMatch = cleaned.match(
                    /^(crimson|amber|azure|violet|topaz|emerald)\b/i,
                  );
                  const color = colorMatch?.[1]
                    ? colorMatch[1][0]!.toUpperCase() +
                      colorMatch[1].slice(1).toLowerCase()
                    : "Crystal";
                  const effect = colorMatch
                    ? cleaned.slice(colorMatch[0].length).trim() || cleaned
                    : cleaned;
                  return {
                    color,
                    effect,
                    ...(tauforged ? { tauforged: true as const } : {}),
                  };
                }),
              });
            }}
          />
        </div>
      ) : null}
    </article>
  );
}

function GearBlock({
  label,
  slot,
  itemNames,
  autoFocusName,
  onChange,
}: {
  label: string;
  slot: GearSlot;
  itemNames: readonly string[];
  autoFocusName?: boolean;
  onChange: (next: GearSlot) => void;
}) {
  const [modsText, setModsText] = useState(() =>
    slot.mods.length ? slot.mods.join(", ") : "",
  );
  const [arcanesText, setArcanesText] = useState(() =>
    slot.arcanes.length ? slot.arcanes.join(", ") : "",
  );

  function commitList(
    raw: string,
    field: "mods" | "arcanes",
    setText: (next: string) => void,
  ) {
    setText(raw);
    onChange({
      ...slot,
      [field]: raw
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return (
    <div className={styles.section} onClick={(e) => e.stopPropagation()}>
      <p className={styles.sectionLabel}>{label}</p>
      <NameSuggestInput
        className={styles.fieldInput}
        value={slot.name}
        placeholder={`${label} name`}
        ariaLabel={`${label} name`}
        dictionary={itemNames}
        autoFocus={autoFocusName}
        onChange={(name) => onChange({ ...slot, name })}
      />
      <NameSuggestInput
        className={styles.listInput}
        mode="list"
        rows={2}
        value={modsText}
        placeholder="Mods — type to autocomplete"
        ariaLabel={`${label} mods`}
        dictionary={suggestPack.mods}
        onChange={(raw) => commitList(raw, "mods", setModsText)}
      />
      <NameSuggestInput
        className={styles.listInput}
        mode="list"
        rows={1}
        value={arcanesText}
        placeholder="Arcanes — type to autocomplete"
        ariaLabel={`${label} arcanes`}
        dictionary={suggestPack.arcanes}
        onChange={(raw) => commitList(raw, "arcanes", setArcanesText)}
      />
    </div>
  );
}
