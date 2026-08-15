"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BuildFolder,
  GearSlot,
  SavedBuild,
  SavedBuildsMemory,
} from "../lib/saved-builds";
import {
  addBuild,
  addFolder,
  buildsInFolder,
  createEmptyBuild,
  deleteBuild,
  deleteFolder,
  renameBuild,
  renameFolder,
  updateBuild,
} from "../lib/saved-builds";
import styles from "./SavedBuildsPane.module.css";

type FolderFilter = "all" | "unfiled" | string;

export function SavedBuildsPane({
  memory,
  onChange,
  selectedBuildId,
  onSelectBuild,
  filterFolderId,
  onFilterFolder,
}: {
  memory: SavedBuildsMemory;
  onChange: (next: SavedBuildsMemory) => void;
  selectedBuildId: string | null;
  onSelectBuild: (id: string | null) => void;
  filterFolderId: FolderFilter;
  onFilterFolder: (id: FolderFilter) => void;
}) {
  const visible = useMemo(() => {
    if (filterFolderId === "all") return buildsInFolder(memory, "all");
    if (filterFolderId === "unfiled") return buildsInFolder(memory, null);
    return buildsInFolder(memory, filterFolderId);
  }, [memory, filterFolderId]);

  function handleAddBuild() {
    const folderId =
      filterFolderId === "all" || filterFolderId === "unfiled"
        ? null
        : filterFolderId;
    const build = createEmptyBuild({ folderId });
    onChange(addBuild(memory, build));
    onSelectBuild(build.id);
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

  return (
    <aside className={styles.pane} aria-label="Saved builds">
      <div className={styles.header}>
        <div>
          <p className={styles.label}>Arsenal</p>
          <h2 className={styles.title}>Saved Builds</h2>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleAddBuild}
            aria-label="Add build slot"
            title="Add build"
          >
            +
          </button>
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
            No builds here yet. Use <code>+ </code> or{" "}
            <code>/save-build</code> to add a card.
          </p>
        ) : (
          visible.map((build) => (
            <BuildCard
              key={build.id}
              build={build}
              folders={memory.folders}
              selected={build.id === selectedBuildId}
              onSelect={() =>
                onSelectBuild(build.id === selectedBuildId ? null : build.id)
              }
              onRename={(name) => onChange(renameBuild(memory, build.id, name))}
              onPatch={(patch) => onChange(updateBuild(memory, build.id, patch))}
            />
          ))
        )}
      </div>

      <p className={styles.footnote}>
        Desktop pane · browser localStorage · double-click names to rename
      </p>
    </aside>
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
  onSelect,
  onRename,
  onPatch,
}: {
  build: SavedBuild;
  folders: BuildFolder[];
  selected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onPatch: (patch: Partial<SavedBuild>) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(build.name);
  const nameRef = useRef<HTMLInputElement | null>(null);

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

      <GearBlock
        label="Warframe"
        slot={build.warframe}
        onChange={(warframe) => onPatch({ warframe })}
      />
      <GearBlock
        label="Primary"
        slot={build.primary}
        onChange={(primary) => onPatch({ primary })}
      />
      <GearBlock
        label="Secondary"
        slot={build.secondary}
        onChange={(secondary) => onPatch({ secondary })}
      />
      <GearBlock
        label="Melee"
        slot={build.melee}
        onChange={(melee) => onPatch({ melee })}
      />
      <GearBlock
        label="Companion"
        slot={build.companion}
        onChange={(companion) => onPatch({ companion })}
      />

      <div
        className={styles.section}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.sectionLabel}>Archon crystals</p>
        <textarea
          className={styles.listInput}
          rows={2}
          placeholder="Crimson Melee Crit, Amber Casting Speed…"
          value={build.archonCrystals
            .map((c) =>
              `${c.color}${c.tauforged ? " Tau" : ""} ${c.effect}`.replace(
                /\s+/g,
                " ",
              ).trim(),
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
    </article>
  );
}

function GearBlock({
  label,
  slot,
  onChange,
}: {
  label: string;
  slot: GearSlot;
  onChange: (next: GearSlot) => void;
}) {
  return (
    <div className={styles.section} onClick={(e) => e.stopPropagation()}>
      <p className={styles.sectionLabel}>{label}</p>
      <input
        className={styles.fieldInput}
        value={slot.name}
        placeholder={`${label} name`}
        aria-label={`${label} name`}
        onChange={(e) => onChange({ ...slot, name: e.target.value })}
      />
      <textarea
        className={styles.listInput}
        rows={2}
        placeholder="Mods (comma-separated)"
        aria-label={`${label} mods`}
        value={slot.mods.join(", ")}
        onChange={(e) =>
          onChange({
            ...slot,
            mods: e.target.value
              .split(/[,;\n]+/)
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
      <textarea
        className={styles.listInput}
        rows={1}
        placeholder="Arcanes (comma-separated)"
        aria-label={`${label} arcanes`}
        value={slot.arcanes.join(", ")}
        onChange={(e) =>
          onChange({
            ...slot,
            arcanes: e.target.value
              .split(/[,;\n]+/)
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
    </div>
  );
}
