export type WeaponClass = "rifle" | "pistol" | "shotgun" | "melee" | "unknown";

export type ElementKey =
  | "impact"
  | "puncture"
  | "slash"
  | "heat"
  | "cold"
  | "electricity"
  | "toxin"
  | "blast"
  | "radiation"
  | "gas"
  | "magnetic"
  | "viral"
  | "corrosive"
  | "void"
  | "true";

export type ModEffects = {
  baseDamage?: number;
  multishot?: number;
  critChance?: number;
  critDamage?: number;
  fireRate?: number;
  reload?: number;
  statusChance?: number;
  faction?: number;
  elemental?: Partial<Record<ElementKey, number>>;
  accuracy?: number;
  notes?: string;
};

export type CuratedMod = {
  name: string;
  classes: Array<WeaponClass | "any">;
  effects: ModEffects;
  faction?: string;
  notes?: string;
};

export type DpsPresetMap = Record<
  string,
  {
    description: string;
    mods: string[];
  }
>;

export type CommonModsFile = {
  version: number;
  notes?: string[];
  mods: CuratedMod[];
  presets: DpsPresetMap;
};

export type WeaponDpsInput = {
  id: string;
  name: string;
  weaponClass: WeaponClass;
  totalDamage: number;
  criticalChance: number;
  criticalMultiplier: number;
  procChance: number;
  fireRate: number;
  magazineSize: number;
  reloadTime: number;
  damage?: Partial<Record<ElementKey, number>>;
  innateMultishot?: number;
};

export type ResolvedModSet = {
  requested: string[];
  applied: Array<{ name: string; effects: ModEffects }>;
  unknown: string[];
  totals: {
    baseDamage: number;
    multishot: number;
    critChance: number;
    critDamage: number;
    fireRate: number;
    reload: number;
    statusChance: number;
    faction: number;
    elemental: Partial<Record<ElementKey, number>>;
  };
};

export type DpsEstimate = {
  weaponName: string;
  weaponClass: WeaponClass;
  modsApplied: string[];
  unknownMods: string[];
  unmodded: {
    damagePerShot: number;
    burstDps: number;
    sustainedDps: number;
  };
  modded: {
    damagePerShot: number;
    avgCritMultiplier: number;
    multishot: number;
    fireRate: number;
    statusChance: number;
    burstDps: number;
    sustainedDps: number;
    elementalBreakdown: Partial<Record<ElementKey, number>>;
  };
  /** Optional effective multipliers for guidance (not full TTK). */
  guidance?: {
    viralAmpMultiplier?: number;
    faction?: string;
    factionMultiplier?: number;
    notes: string[];
  };
};

export type WeaponDpsCompare = {
  a: DpsEstimate;
  b: DpsEstimate;
  winnerBurst: string;
  winnerSustained: string;
  burstDeltaPct: number;
  sustainedDeltaPct: number;
  summary: string;
};
