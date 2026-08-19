#!/usr/bin/env node
/**
 * Temporary Cloudflare Quick Tunnel for human testing.
 * Shares local web chat as https://*.trycloudflare.com (no Cloudflare account).
 *
 *   npm run web:start          # terminal 1 (or web:dev)
 *   npm run web:tunnel         # terminal 2
 */
import { spawn, spawnSync } from "node:child_process";

const HELP = `Share local web chat over a temporary HTTPS Cloudflare tunnel.

Usage:
  npm run web:tunnel
  npm run web:tunnel -- --url http://127.0.0.1:3000

Requires cloudflared on PATH:
  Windows:  winget install --id Cloudflare.cloudflared
  macOS:    brew install cloudflared
  Linux:    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

Start the chat first (another terminal):
  npm run web:build && npm run web:start
  # or: npm run web:dev

Set CHAT_PASSWORD in web/.env.local before sharing the URL.
Ctrl+C stops the tunnel (the trycloudflare URL dies with it).
`;

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function whichCloudflared() {
  const cmd = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(cmd, ["cloudflared"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status === 0 && result.stdout.trim()) return "cloudflared";
  const exe = spawnSync(cmd, ["cloudflared.exe"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (exe.status === 0 && exe.stdout.trim()) return "cloudflared.exe";
  return null;
}

async function probeLocal(url) {
  const health = new URL("/api/health", url).href;
  try {
    const response = await fetch(health, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    process.stdout.write(HELP);
    return;
  }

  const origin = argValue("--url") || process.env.TUNNEL_URL || "http://127.0.0.1:3000";
  const bin = whichCloudflared();
  if (!bin) {
    process.stderr.write(
      "cloudflared not found on PATH.\n\n" +
        "Install:\n" +
        "  Windows:  winget install --id Cloudflare.cloudflared\n" +
        "  macOS:    brew install cloudflared\n" +
        "  Linux:    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n" +
        "Then reopen the terminal and run: npm run web:tunnel\n",
    );
    process.exit(1);
  }

  const up = await probeLocal(origin);
  if (!up) {
    process.stderr.write(
      `No chat server at ${origin}\n` +
        "In another terminal start:\n" +
        "  npm run web:build && npm run web:start\n" +
        "  # or npm run web:dev  (HMR is flaky through a tunnel; prefer web:start)\n\n",
    );
  }

  process.stderr.write(
    "Cloudflare Quick Tunnel — temporary https://*.trycloudflare.com URL.\n" +
      "Share the URL *and* CHAT_PASSWORD. Stop the tunnel with Ctrl+C.\n" +
      `Forwarding ${origin}\n\n`,
  );

  const child = spawn(
    bin,
    ["tunnel", "--no-autoupdate", "--url", origin],
    { stdio: "inherit" },
  );
  child.on("exit", (code, signal) => {
    if (signal) process.exit(1);
    process.exit(code ?? 0);
  });
}

await main();
