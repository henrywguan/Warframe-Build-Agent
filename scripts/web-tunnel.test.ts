import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(repoRoot, "scripts", "web-tunnel.mjs");

describe("web Cloudflare Quick Tunnel", () => {
  it("documents trycloudflare sharing and refuses missing cloudflared helpfully", () => {
    const source = readFileSync(script, "utf8");
    assert.match(source, /trycloudflare\.com/);
    assert.match(source, /CHAT_PASSWORD/);
    assert.match(source, /tunnel", "--no-autoupdate", "--url"/);
    assert.match(source, /winget install --id Cloudflare\.cloudflared/);
  });

  it("prints usage on --help", () => {
    const result = spawnSync(process.execPath, [script, "--help"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /CHAT_PASSWORD/);
    assert.match(result.stdout, /web:tunnel/);
  });
});
