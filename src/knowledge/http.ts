const DEFAULT_UA =
  "WarframeBuildAgentKnowledgePack/0.1 (+https://github.com/henrywguan/Warframe-Build-Agent; agent-usable offline pack)";

export async function fetchText(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; text: string; contentType: string }> {
  const { timeoutMs = 30_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "application/json,text/plain,text/html;q=0.9,*/*;q=0.8",
        ...(rest.headers || {}),
      },
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text,
      contentType: response.headers.get("content-type") || "",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string, options?: { retries?: number }): Promise<T> {
  const retries = Math.max(0, options?.retries ?? 3);
  let lastStatus = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await fetchText(url, {
      headers: { Accept: "application/json" },
    });
    if (result.ok) {
      return JSON.parse(result.text) as T;
    }
    lastStatus = result.status;
    const retryable = result.status === 429 || result.status >= 500;
    if (!retryable || attempt === retries) break;
    await sleep(250 * 2 ** attempt);
  }
  throw new Error(`HTTP ${lastStatus} for ${url}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]!, index);
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}
