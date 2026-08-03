export type OrdisMood = "idle" | "thinking" | "speaking";

/** How long the cephalon stays in the speaking mood after a reply lands. */
export const SPEAKING_MS = 3400;

export function deriveOrdisMood(
  pending: boolean,
  speaking: boolean,
): OrdisMood {
  if (pending) return "thinking";
  if (speaking) return "speaking";
  return "idle";
}

export function ordisCaption(mood: OrdisMood): string {
  if (mood === "thinking") return "Consulting the ship’s systems…";
  if (mood === "speaking") return "Ordis is transmitting…";
  return "Operator? Ordis is standing by.";
}

/** Pure helper for tests: assistant reply should trigger speaking when not pending. */
export function shouldTriggerSpeaking(options: {
  role: "user" | "assistant";
  id: string;
  pending: boolean;
  welcomeId?: string;
}): boolean {
  const welcomeId = options.welcomeId ?? "welcome";
  if (options.pending) return false;
  if (options.role !== "assistant") return false;
  if (options.id === welcomeId) return false;
  return true;
}
