export type Platform = "pc" | "ps4" | "psn" | "xb1" | "swi" | "ns";

export const DEFAULT_PLATFORM: Platform = "pc";
export const DEFAULT_LANGUAGE = "en";
export const API_BASE = "https://api.warframestat.us";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface MissionReward {
  credits?: number;
  items?: string[];
  countedItems?: Array<{ count?: number; type?: string; key?: string }>;
  thumbnail?: string;
}

export interface AlertMission {
  node?: string;
  type?: string;
  faction?: string;
  minEnemyLevel?: number;
  maxEnemyLevel?: number;
  reward?: MissionReward;
  nightmare?: boolean;
  archwingRequired?: boolean;
}

export interface Alert {
  id?: string;
  activation?: string;
  expiry?: string;
  mission?: AlertMission;
  rewardTypes?: string[];
}

export interface Fissure {
  id?: string;
  node?: string;
  missionType?: string;
  enemy?: string;
  tier?: string;
  tierNum?: number;
  expiry?: string;
  isHard?: boolean;
  isStorm?: false | boolean;
}

export interface InvasionFaction {
  faction?: string;
  reward?: MissionReward;
}

export interface Invasion {
  id?: string;
  node?: string;
  desc?: string;
  attacker?: InvasionFaction;
  defender?: InvasionFaction;
  completion?: number;
  completed?: boolean;
  vsInfestation?: boolean;
  expiry?: string;
  rewardTypes?: string[];
}

export interface SortieVariant {
  missionType?: string;
  modifier?: string;
  modifierDescription?: string;
  node?: string;
}

export interface Sortie {
  boss?: string;
  faction?: string;
  expiry?: string;
  variants?: SortieVariant[];
  missions?: Array<{ node?: string; type?: string }>;
}

export interface ArchonHunt {
  boss?: string;
  faction?: string;
  expiry?: string;
  missions?: Array<{ node?: string; type?: string; typeKey?: string }>;
}

export interface NightwaveChallenge {
  title?: string;
  desc?: string;
  reputation?: number;
  isDaily?: boolean;
  isElite?: boolean;
  expiry?: string;
}

export interface Nightwave {
  season?: number;
  phase?: number;
  expiry?: string;
  activeChallenges?: NightwaveChallenge[];
}

export interface VoidTraderItem {
  item?: string;
  ducats?: number;
  credits?: number;
}

export interface VoidTrader {
  character?: string;
  location?: string;
  activation?: string;
  expiry?: string;
  active?: boolean;
  inventory?: VoidTraderItem[];
}

export interface SteelPathReward {
  name?: string;
  cost?: number;
}

export interface SteelPath {
  currentReward?: SteelPathReward | string;
  remaining?: string;
  expiry?: string;
  activation?: string;
}

export interface CycleState {
  state?: string;
  timeLeft?: string;
  expiry?: string;
  isDay?: boolean;
  isWarm?: boolean;
  isCorpus?: boolean;
}

export interface WorldEvent {
  description?: string;
  tooltip?: string;
  expiry?: string;
  activation?: string;
  health?: number;
  maximumScore?: number;
  currentScore?: number;
  rewards?: MissionReward[];
}

export interface Arbitration {
  node?: string;
  nodeKey?: string;
  type?: string;
  typeKey?: string;
  enemy?: string;
  faction?: string;
  expiry?: string;
  activation?: string;
  archwing?: boolean;
  sharkwing?: boolean;
  /** Status API sets true when the placeholder “no active arb” payload is returned. */
  expired?: boolean;
}

export interface DailyDeal {
  item?: string;
  originalPrice?: number;
  salePrice?: number;
  total?: number;
  sold?: number;
  expiry?: string;
  discount?: number;
}

export interface ConstructionProgress {
  id?: string;
  fomorianProgress?: number | string;
  razorbackProgress?: number | string;
  unknownProgress?: number | string;
}

export interface ClientOptions {
  platform?: Platform;
  language?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}
