import {
  API_BASE,
  DEFAULT_LANGUAGE,
  DEFAULT_PLATFORM,
  type Alert,
  type ArchonHunt,
  type Arbitration,
  type ClientOptions,
  type ConstructionProgress,
  type CycleState,
  type DailyDeal,
  type Fissure,
  type Invasion,
  type JsonValue,
  type Nightwave,
  type Platform,
  type Sortie,
  type SteelPath,
  type VoidTrader,
  type WorldEvent,
} from "./types.js";

const CYCLE_KEYS = [
  "cetusCycle",
  "vallisCycle",
  "cambionCycle",
  "earthCycle",
  "zarimanCycle",
  "duviriCycle",
] as const;

type CycleKey = (typeof CYCLE_KEYS)[number];

export interface WorldstateSnapshot {
  alerts?: Alert[];
  fissures?: Fissure[];
  invasions?: Invasion[];
  sortie?: Sortie;
  archonHunt?: ArchonHunt;
  nightwave?: Nightwave;
  voidTrader?: VoidTrader;
  steelPath?: SteelPath;
  events?: WorldEvent[];
  cetusCycle?: CycleState;
  vallisCycle?: CycleState;
  cambionCycle?: CycleState;
  earthCycle?: CycleState;
  zarimanCycle?: CycleState;
  duviriCycle?: CycleState;
}

export class WarframeStatusError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "WarframeStatusError";
    this.status = status;
    this.path = path;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCycles(worldstate: WorldstateSnapshot): Record<string, CycleState> {
  const cycles: Record<string, CycleState> = {};
  for (const key of CYCLE_KEYS) {
    cycles[key] = (worldstate[key] as CycleState | undefined) ?? {};
  }
  return cycles;
}

export class WarframeStatusClient {
  readonly platform: Platform;
  readonly language: string;
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions = {}) {
    this.platform = options.platform ?? DEFAULT_PLATFORM;
    this.language = options.language ?? DEFAULT_LANGUAGE;
    this.baseUrl = (options.baseUrl ?? API_BASE).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  getWorldstate(): Promise<WorldstateSnapshot> {
    return this.request<WorldstateSnapshot>(`/${this.platform}`);
  }

  async getField<T = JsonValue>(field: string): Promise<T> {
    const clean = field.replace(/^\/+/, "");
    return this.request<T>(`/${this.platform}/${clean}`);
  }

  getAlerts(): Promise<Alert[]> {
    return this.getField<Alert[]>("alerts");
  }

  getFissures(): Promise<Fissure[]> {
    return this.getField<Fissure[]>("fissures");
  }

  getInvasions(): Promise<Invasion[]> {
    return this.getField<Invasion[]>("invasions");
  }

  getSortie(): Promise<Sortie> {
    return this.getField<Sortie>("sortie");
  }

  getArchonHunt(): Promise<ArchonHunt> {
    return this.getField<ArchonHunt>("archonHunt");
  }

  getNightwave(): Promise<Nightwave> {
    return this.getField<Nightwave>("nightwave");
  }

  getVoidTrader(): Promise<VoidTrader> {
    return this.getField<VoidTrader>("voidTrader");
  }

  getSteelPath(): Promise<SteelPath> {
    return this.getField<SteelPath>("steelPath");
  }

  getEvents(): Promise<WorldEvent[]> {
    return this.getField<WorldEvent[]>("events");
  }

  getArbitration(): Promise<Arbitration> {
    return this.getField<Arbitration>("arbitration");
  }

  getDailyDeals(): Promise<DailyDeal[]> {
    return this.getField<DailyDeal[]>("dailyDeals");
  }

  getConstructionProgress(): Promise<ConstructionProgress> {
    return this.getField<ConstructionProgress>("constructionProgress");
  }

  async getCycles(): Promise<Record<string, CycleState>> {
    // One worldstate pull avoids hammering per-cycle endpoints.
    const worldstate = await this.getWorldstate();
    return extractCycles(worldstate);
  }

  async getSummary(): Promise<{
    platform: Platform;
    alerts: Alert[];
    fissures: Fissure[];
    invasions: Invasion[];
    sortie: Sortie;
    archonHunt: ArchonHunt;
    nightwave: Nightwave;
    voidTrader: VoidTrader;
    steelPath: SteelPath;
    cycles: Record<string, CycleState>;
    events: WorldEvent[];
  }> {
    const worldstate = await this.getWorldstate();

    return {
      platform: this.platform,
      alerts: worldstate.alerts ?? [],
      fissures: worldstate.fissures ?? [],
      invasions: worldstate.invasions ?? [],
      sortie: worldstate.sortie ?? {},
      archonHunt: worldstate.archonHunt ?? {},
      nightwave: worldstate.nightwave ?? {},
      voidTrader: worldstate.voidTrader ?? {},
      steelPath: worldstate.steelPath ?? {},
      cycles: extractCycles(worldstate),
      events: worldstate.events ?? [],
    };
  }

  private async request<T>(path: string, attempt = 1): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("language", this.language);

    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "warframe-build-agent/0.1.0",
      },
    });

    if (!response.ok) {
      const retryable = response.status === 502 || response.status === 503 || response.status === 504;
      if (retryable && attempt < 3) {
        await sleep(400 * attempt);
        return this.request<T>(path, attempt + 1);
      }

      throw new WarframeStatusError(
        `Warframe Status request failed (${response.status}) for ${path}`,
        response.status,
        path,
      );
    }

    return (await response.json()) as T;
  }
}

export type { CycleKey };
