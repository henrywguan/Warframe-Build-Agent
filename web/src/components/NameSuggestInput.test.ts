import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "NameSuggestInput.tsx"), "utf8");

describe("NameSuggestInput", () => {
  it("is a combobox with listbox options and list-mode picks", () => {
    assert.match(src, /role="listbox"/);
    assert.match(src, /role="option"/);
    assert.match(src, /applySuggestPick/);
    assert.match(src, /aria-autocomplete/);
    assert.match(src, /mode === "list"/);
  });
});
