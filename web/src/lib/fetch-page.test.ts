import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertSafePublicUrl,
  formatFetchedPage,
  htmlToPlainText,
} from "./fetch-page.ts";

describe("fetch-page helpers", () => {
  it("allows public https URLs and blocks private hosts", () => {
    assert.equal(
      assertSafePublicUrl("https://www.warframe.com/en/patch-notes/pc/43-0-8")
        .hostname,
      "www.warframe.com",
    );
    assert.throws(() => assertSafePublicUrl("http://127.0.0.1/secret"), /Blocked/);
    assert.throws(() => assertSafePublicUrl("http://192.168.1.1/"), /Blocked/);
    assert.throws(() => assertSafePublicUrl("file:///etc/passwd"), /http/);
  });

  it("converts HTML fragments to plain text", () => {
    const text = htmlToPlainText(
      "<h1>Title</h1><p>Hello</p><ul><li>\nOne\n</li></ul>",
    );
    assert.match(text, /Title/);
    assert.match(text, /Hello/);
    assert.match(text, /^- One$/m);
  });

  it("formats fetched pages with source + no-invent note", () => {
    const formatted = formatFetchedPage({
      url: "https://wiki.warframe.com/w/Mesa",
      title: "Mesa",
      body: "Mesa is a Warframe.",
      truncated: false,
      fullLength: 18,
      status: 200,
    });
    assert.match(formatted, /WEB_PAGE_CONTENT/);
    assert.match(formatted, /wiki\.warframe\.com/);
    assert.match(formatted, /do not invent/);
  });
});
