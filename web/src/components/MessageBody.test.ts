import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "MessageBody.tsx"), "utf8");
const css = readFileSync(join(here, "MessageBody.module.css"), "utf8");

describe("MessageBody markdown rendering", () => {
  it("renders assistant text through react-markdown with GFM + soft breaks", () => {
    assert.match(source, /from ["']react-markdown["']/);
    assert.match(source, /remarkGfm/);
    assert.match(source, /remarkBreaks/);
    assert.match(source, /skipHtml/);
    assert.match(source, /function Markdown/);
  });

  it("keeps compare columns and styles markdown blocks", () => {
    assert.match(source, /splitAbCompare/);
    assert.match(source, /compareColumns/);
    assert.match(css, /\.markdown\s/);
    assert.match(css, /\.markdown\s+pre\b|\.markdown\s+:where\(pre/);
    assert.match(css, /table/);
  });

  it("opens http(s) links in a new tab safely", () => {
    assert.match(source, /noopener noreferrer/);
    assert.match(source, /target=\{external \? "_blank"/);
  });
});
