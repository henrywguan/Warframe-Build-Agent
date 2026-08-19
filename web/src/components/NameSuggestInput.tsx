"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import {
  applySuggestPick,
  suggestNames,
  type SuggestMode,
} from "../lib/name-suggest";
import styles from "./NameSuggestInput.module.css";

export function NameSuggestInput({
  value,
  onChange,
  dictionary,
  mode = "single",
  placeholder,
  ariaLabel,
  className,
  rows,
  autoFocus = false,
  disabled = false,
  onPick,
  id,
  inputRef: inputRefProp,
}: {
  value: string;
  onChange: (next: string) => void;
  dictionary: readonly string[];
  mode?: SuggestMode;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  rows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  onPick?: (name: string) => void;
  id?: string;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const query =
    mode === "list"
      ? value.match(/[^,;\n]*$/)?.[0]?.trim() ?? ""
      : value.trim();
  const exclude =
    mode === "list"
      ? value
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, -1)
      : [];
  const hits = useMemo(
    () => suggestNames(query, dictionary, { exclude, limit: 8 }),
    [query, dictionary, exclude.join("|")],
  );

  function assignInput(
    el: HTMLInputElement | HTMLTextAreaElement | null,
  ) {
    inputRef.current = el;
    if (!inputRefProp) return;
    if (typeof inputRefProp === "function") inputRefProp(el);
    else (inputRefProp as { current: typeof el }).current = el;
  }

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pick(name: string) {
    onChange(applySuggestPick(value, name, mode));
    setOpen(false);
    inputRef.current?.focus();
    onPick?.(name);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp") && hits.length) {
      setOpen(true);
      event.preventDefault();
      return;
    }
    if (!open || !hits.length) {
      if (event.key === "Escape") setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter" && hits[active]) {
      event.preventDefault();
      pick(hits[active]!);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const showList = open && hits.length > 0;
  const shared = {
    className,
    value,
    placeholder,
    disabled,
    autoComplete: "off" as const,
    "aria-label": ariaLabel,
    "aria-autocomplete": "list" as const,
    "aria-expanded": showList,
    "aria-controls": listId,
    onChange: (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      onChange(event.target.value);
      setOpen(true);
    },
    onFocus: () => setOpen(true),
    onKeyDown,
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {rows && rows > 1 ? (
        <textarea
          {...shared}
          id={id}
          rows={rows}
          ref={assignInput}
        />
      ) : (
        <input
          {...shared}
          id={id}
          type="text"
          ref={assignInput}
        />
      )}
      {showList ? (
        <ul className={styles.list} id={listId} role="listbox">
          {hits.map((name, index) => (
            <li key={name} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={`${styles.option} ${
                  index === active ? styles.optionActive : ""
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
