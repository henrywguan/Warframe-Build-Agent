import type {
  Alert,
  ArchonHunt,
  CycleState,
  Fissure,
  Invasion,
  MissionReward,
  Nightwave,
  Sortie,
  SteelPath,
  VoidTrader,
  WorldEvent,
} from "./types.js";

export function humanizeExpiry(expiry?: string, now = Date.now()): string {
  if (!expiry) return "unknown timer";
  const ms = Date.parse(expiry) - now;
  if (Number.isNaN(ms)) return expiry;
  if (ms <= 0) return "expired";

  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `~${totalMinutes}m left`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 48) return `~${hours}h ${minutes}m left`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `~${days}d ${remHours}h left`;
}

function formatReward(reward?: MissionReward): string {
  if (!reward) return "no listed reward";
  const parts: string[] = [];
  if (reward.items?.length) parts.push(...reward.items);
  if (reward.countedItems?.length) {
    for (const item of reward.countedItems) {
      const name = item.type ?? item.key ?? "item";
      parts.push(item.count ? `${item.count}x ${name}` : name);
    }
  }
  if (typeof reward.credits === "number" && reward.credits > 0) {
    parts.push(`${reward.credits.toLocaleString()} credits`);
  }
  return parts.length ? parts.join(", ") : "no listed reward";
}

export function formatAlerts(alerts: Alert[]): string {
  if (!alerts.length) return "No alerts active.";
  return alerts
    .map((alert, index) => {
      const mission = alert.mission;
      return [
        `${index + 1}. ${mission?.node ?? "Unknown node"} — ${mission?.type ?? "Mission"}`,
        `   Faction: ${mission?.faction ?? "?"}`,
        `   Reward: ${formatReward(mission?.reward)}`,
        `   ${humanizeExpiry(alert.expiry)}`,
      ].join("\n");
    })
    .join("\n");
}

export function formatFissures(
  fissures: Fissure[],
  options: { steelPathOnly?: boolean; tier?: string } = {},
): string {
  let list = fissures.filter((f) => !f.expiry || Date.parse(f.expiry) > Date.now());
  if (options.steelPathOnly) list = list.filter((f) => f.isHard);
  if (options.tier) {
    const wanted = options.tier.toLowerCase();
    list = list.filter((f) => (f.tier ?? "").toLowerCase() === wanted);
  }

  if (!list.length) return "No matching fissures right now.";

  return list
    .map((f) => {
      const path = f.isHard ? "Steel Path" : "Star Chart";
      const storm = f.isStorm ? " / Railjack" : "";
      return `• ${f.tier ?? "?"} ${f.missionType ?? "Mission"} @ ${f.node ?? "?"} (${f.enemy ?? "?"}) — ${path}${storm} — ${humanizeExpiry(f.expiry)}`;
    })
    .join("\n");
}

export function formatInvasions(invasions: Invasion[]): string {
  const active = invasions.filter((i) => !i.completed);
  if (!active.length) return "No active invasions.";

  return active
    .map((inv) => {
      const attackerReward = formatReward(inv.attacker?.reward);
      const defenderReward = formatReward(inv.defender?.reward);
      const completion =
        typeof inv.completion === "number"
          ? `${inv.completion.toFixed(1)}%`
          : "n/a";
      return [
        `• ${inv.node ?? "Unknown"} — ${inv.desc ?? "Invasion"} (${completion})`,
        `   Attacker (${inv.attacker?.faction ?? "?"}): ${attackerReward}`,
        `   Defender (${inv.defender?.faction ?? "?"}): ${defenderReward}`,
      ].join("\n");
    })
    .join("\n");
}

export function formatSortie(sortie: Sortie): string {
  if (!sortie || (!sortie.boss && !sortie.variants?.length && !sortie.missions?.length)) {
    return "No sortie data available.";
  }

  const lines = [
    `Boss: ${sortie.boss ?? "?"}`,
    `Faction: ${sortie.faction ?? "?"}`,
    `Timer: ${humanizeExpiry(sortie.expiry)}`,
    "Missions:",
  ];

  if (sortie.variants?.length) {
    for (const [i, variant] of sortie.variants.entries()) {
      lines.push(
        `  ${i + 1}. ${variant.missionType ?? "Mission"} @ ${variant.node ?? "?"}`,
      );
      lines.push(
        `     ${variant.modifier ?? "Modifier"}${variant.modifierDescription ? ` — ${variant.modifierDescription}` : ""}`,
      );
    }
  } else if (sortie.missions?.length) {
    for (const [i, mission] of sortie.missions.entries()) {
      lines.push(`  ${i + 1}. ${mission.type ?? "Mission"} @ ${mission.node ?? "?"}`);
    }
  }

  return lines.join("\n");
}

export function formatArchonHunt(hunt: ArchonHunt): string {
  if (!hunt?.boss) return "No Archon Hunt data available.";
  const lines = [
    `Boss: ${hunt.boss}`,
    `Faction: ${hunt.faction ?? "?"}`,
    `Timer: ${humanizeExpiry(hunt.expiry)}`,
    "Missions:",
  ];
  for (const [i, mission] of (hunt.missions ?? []).entries()) {
    lines.push(
      `  ${i + 1}. ${mission.type ?? mission.typeKey ?? "Mission"} @ ${mission.node ?? "?"}`,
    );
  }
  return lines.join("\n");
}

export function formatNightwave(nightwave: Nightwave): string {
  if (!nightwave) return "No Nightwave data available.";
  const challenges = nightwave.activeChallenges ?? [];
  const lines = [
    `Season ${nightwave.season ?? "?"} / phase ${nightwave.phase ?? "?"}`,
    `Timer: ${humanizeExpiry(nightwave.expiry)}`,
    `Active challenges (${challenges.length}):`,
  ];

  if (!challenges.length) {
    lines.push("  None listed.");
    return lines.join("\n");
  }

  for (const challenge of challenges) {
    const tags = [
      challenge.isDaily ? "daily" : "weekly",
      challenge.isElite ? "elite" : null,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(
      `• ${challenge.title ?? "Challenge"} [${tags}] — ${challenge.reputation ?? "?"} standing`,
    );
    if (challenge.desc) lines.push(`   ${challenge.desc}`);
  }

  return lines.join("\n");
}

export function formatVoidTrader(trader: VoidTrader): string {
  if (!trader?.character && !trader?.location) {
    return "No Void Trader data available.";
  }

  const arriving = trader.activation
    ? Date.parse(trader.activation) > Date.now()
    : false;
  const active =
    typeof trader.active === "boolean"
      ? trader.active
      : !arriving && !!trader.expiry && Date.parse(trader.expiry) > Date.now();

  const lines = [
    `${trader.character ?? "Baro Ki'Teer"} @ ${trader.location ?? "?"}`,
    active
      ? `Present — leaves in ${humanizeExpiry(trader.expiry)}`
      : `Not present — arrives in ${humanizeExpiry(trader.activation)}`,
  ];

  const inventory = trader.inventory ?? [];
  if (active && inventory.length) {
    lines.push(`Inventory (${inventory.length} items):`);
    for (const item of inventory.slice(0, 25)) {
      lines.push(
        `• ${item.item ?? "item"} — ${item.ducats ?? "?"} ducats / ${item.credits?.toLocaleString() ?? "?"} credits`,
      );
    }
    if (inventory.length > 25) {
      lines.push(`…and ${inventory.length - 25} more (use --json for full list)`);
    }
  }

  return lines.join("\n");
}

export function formatSteelPath(steelPath: SteelPath): string {
  if (!steelPath) return "No Steel Path data available.";
  const reward =
    typeof steelPath.currentReward === "string"
      ? steelPath.currentReward
      : steelPath.currentReward?.name ?? "unknown reward";
  const cost =
    typeof steelPath.currentReward === "object" &&
    steelPath.currentReward &&
    "cost" in steelPath.currentReward
      ? ` (${steelPath.currentReward.cost} Steel Essence)`
      : "";

  return [
    `Current honor reward: ${reward}${cost}`,
    `Remaining in rotation: ${steelPath.remaining ?? humanizeExpiry(steelPath.expiry)}`,
  ].join("\n");
}

export function formatCycles(cycles: Record<string, CycleState>): string {
  const labels: Record<string, string> = {
    cetusCycle: "Cetus / Plains",
    vallisCycle: "Orb Vallis",
    cambionCycle: "Cambion Drift",
    earthCycle: "Earth",
    zarimanCycle: "Zariman",
    duviriCycle: "Duviri",
  };

  return Object.entries(labels)
    .map(([key, label]) => {
      const cycle = cycles[key] ?? {};
      const state =
        cycle.state ??
        (cycle.isDay === true
          ? "day"
          : cycle.isDay === false
            ? "night"
            : cycle.isWarm === true
              ? "warm"
              : cycle.isWarm === false
                ? "cold"
                : cycle.isCorpus === true
                  ? "corpus"
                  : cycle.isCorpus === false
                    ? "grineer"
                    : "unknown");
      return `• ${label}: ${state} — ${cycle.timeLeft ?? humanizeExpiry(cycle.expiry)}`;
    })
    .join("\n");
}

export function formatEvents(events: WorldEvent[]): string {
  if (!events.length) return "No events listed.";
  return events
    .map((event) => {
      const title = event.description ?? event.tooltip ?? "Event";
      const progress =
        typeof event.health === "number"
          ? `health ${event.health}`
          : typeof event.currentScore === "number" &&
              typeof event.maximumScore === "number"
            ? `score ${event.currentScore}/${event.maximumScore}`
            : null;
      return `• ${title}${progress ? ` (${progress})` : ""} — ${humanizeExpiry(event.expiry)}`;
    })
    .join("\n");
}

export function formatSummary(parts: {
  platform: string;
  alerts: Alert[];
  fissures: Fissure[];
  invasions: Invasion[];
  sortie: Sortie;
  archonHunt: ArchonHunt;
  voidTrader: VoidTrader;
  steelPath: SteelPath;
  cycles: Record<string, CycleState>;
  events: WorldEvent[];
}): string {
  const hardFissures = parts.fissures.filter((f) => f.isHard).length;
  const activeInvasions = parts.invasions.filter((i) => !i.completed).length;

  return [
    `Warframe worldstate summary (platform: ${parts.platform})`,
    `Source: api.warframestat.us — timers can shift; re-check before you commit a long farm.`,
    "",
    `Alerts: ${parts.alerts.length}`,
    `Fissures: ${parts.fissures.length} (${hardFissures} Steel Path)`,
    `Invasions: ${activeInvasions} active`,
    `Events: ${parts.events.length}`,
    "",
    "Sortie",
    formatSortie(parts.sortie),
    "",
    "Archon Hunt",
    formatArchonHunt(parts.archonHunt),
    "",
    "Void Trader",
    formatVoidTrader(parts.voidTrader),
    "",
    "Steel Path honor",
    formatSteelPath(parts.steelPath),
    "",
    "Open-world cycles",
    formatCycles(parts.cycles),
  ].join("\n");
}
