/** Persistent player profile for personalized advice. */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveRepoRoot } from "./repo-root.js";
import { writeFileDurable } from "./fs-write.js";

export type PlayerBudget = "low" | "mid" | "high";

export type PlayerProfile = {
  masteryRank?: number;
  steelPath?: boolean;
  platform?: string;
  budget?: PlayerBudget;
  playstyle?: string;
  ownedFrames?: string[];
  ownedWeapons?: string[];
  ownedMods?: string[];
  goals?: string[];
  updatedAt?: string;
};

export function playerProfilePath(repoRoot?: string): string {
  return path.join(resolveRepoRoot(repoRoot), "data", "knowledge", "player-profile.json");
}

export async function loadPlayerProfile(repoRoot?: string): Promise<PlayerProfile | null> {
  try {
    const raw = await readFile(playerProfilePath(repoRoot), "utf8");
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export async function savePlayerProfile(
  profile: PlayerProfile,
  repoRoot?: string,
): Promise<PlayerProfile> {
  const next: PlayerProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  await writeFileDurable(
    playerProfilePath(repoRoot),
    `${JSON.stringify(next, null, 2)}\n`,
  );
  return next;
}

export async function updatePlayerProfile(
  partial: Partial<PlayerProfile>,
  repoRoot?: string,
): Promise<PlayerProfile> {
  const current = (await loadPlayerProfile(repoRoot)) ?? {};
  return savePlayerProfile({ ...current, ...partial }, repoRoot);
}

export function formatPlayerProfile(profile: PlayerProfile | null): string {
  if (!profile) {
    return [
      "Player profile: (not set)",
      "",
      "Set with: npm run knowledge -- profile-set --mr 15 --steel-path --budget low",
    ].join("\n");
  }

  const lines = ["Player profile", ""];
  if (profile.masteryRank != null) lines.push(`Mastery: MR ${profile.masteryRank}`);
  if (profile.steelPath != null) lines.push(`Steel Path: ${profile.steelPath ? "unlocked" : "not yet"}`);
  if (profile.platform) lines.push(`Platform: ${profile.platform}`);
  if (profile.budget) lines.push(`Budget: ${profile.budget}`);
  if (profile.playstyle) lines.push(`Playstyle: ${profile.playstyle}`);
  if (profile.goals?.length) lines.push(`Goals: ${profile.goals.join(", ")}`);
  if (profile.ownedFrames?.length) {
    lines.push(`Frames (${profile.ownedFrames.length}): ${profile.ownedFrames.slice(0, 8).join(", ")}`);
  }
  if (profile.ownedWeapons?.length) {
    lines.push(`Weapons (${profile.ownedWeapons.length}): ${profile.ownedWeapons.slice(0, 8).join(", ")}`);
  }
  if (profile.ownedMods?.length) {
    lines.push(`Mods (${profile.ownedMods.length}): ${profile.ownedMods.slice(0, 8).join(", ")}`);
  }
  if (profile.updatedAt) lines.push("", `Updated: ${profile.updatedAt}`);
  return lines.join("\n");
}
