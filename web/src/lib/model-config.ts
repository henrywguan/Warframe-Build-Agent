/**
 * Browser-saved OpenAI-compatible LLM settings (Ollama / LM Studio / cloud).
 * Stored in localStorage and sent with each /api/chat request.
 */

export type ClientLlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  visionModel: string;
};

export const LLM_STORAGE_KEY = "wfba_llm_config";

export const DEFAULT_OLLAMA: ClientLlmConfig = {
  apiKey: "ollama",
  baseUrl: "http://127.0.0.1:11434/v1",
  model: "qwen2.5",
  visionModel: "llava",
};

export function emptyLlmConfig(): ClientLlmConfig {
  return { apiKey: "", baseUrl: "", model: "", visionModel: "" };
}

export function loadLlmConfig(): ClientLlmConfig {
  if (typeof window === "undefined") return emptyLlmConfig();
  try {
    const raw = window.localStorage.getItem(LLM_STORAGE_KEY);
    if (!raw) return emptyLlmConfig();
    const parsed = JSON.parse(raw) as Partial<ClientLlmConfig>;
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
      visionModel: typeof parsed.visionModel === "string" ? parsed.visionModel : "",
    };
  } catch {
    return emptyLlmConfig();
  }
}

export function saveLlmConfig(config: ClientLlmConfig): void {
  window.localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(config));
}

export function clearLlmConfig(): void {
  window.localStorage.removeItem(LLM_STORAGE_KEY);
}

export function llmConfigReady(config: ClientLlmConfig): boolean {
  return Boolean(config.apiKey.trim());
}

/** Normalize optional body.llm from the client. */
export function parseClientLlm(
  value: unknown,
): Partial<ClientLlmConfig> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const out: Partial<ClientLlmConfig> = {};
  if (typeof row.apiKey === "string" && row.apiKey.trim()) out.apiKey = row.apiKey.trim();
  if (typeof row.baseUrl === "string" && row.baseUrl.trim()) out.baseUrl = row.baseUrl.trim();
  if (typeof row.model === "string" && row.model.trim()) out.model = row.model.trim();
  if (typeof row.visionModel === "string" && row.visionModel.trim()) {
    out.visionModel = row.visionModel.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

export function resolveApiKey(client?: Partial<ClientLlmConfig>): string | undefined {
  return client?.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function resolveBaseUrl(client?: Partial<ClientLlmConfig>): string | undefined {
  return client?.baseUrl?.trim() || process.env.OPENAI_BASE_URL?.trim() || undefined;
}

export function resolveModel(
  client: Partial<ClientLlmConfig> | undefined,
  hasVision: boolean,
): string {
  const fallback = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  if (hasVision) {
    return (
      client?.visionModel?.trim() ||
      process.env.OPENAI_VISION_MODEL?.trim() ||
      client?.model?.trim() ||
      fallback
    );
  }
  return client?.model?.trim() || fallback;
}
