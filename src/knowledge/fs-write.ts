import { rename, unlink, writeFile } from "node:fs/promises";
import { sleep } from "./http.js";

function isTransientFsError(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("code" in err)) return false;
  // OneDrive / Windows often surfaces locks as UNKNOWN, EBUSY, EPERM, or EACCES.
  return ["EBUSY", "EPERM", "EACCES", "UNKNOWN", "EAGAIN"].includes(String(err.code));
}

/** Write text with retries; uses temp+rename to reduce OneDrive mid-write locks. */
export async function writeFileDurable(
  filePath: string,
  contents: string,
  options?: { attempts?: number },
): Promise<void> {
  const attempts = Math.max(1, options?.attempts ?? 8);
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await writeFile(tmpPath, contents, "utf8");
      try {
        await rename(tmpPath, filePath);
      } catch (renameErr) {
        // Windows cannot always rename over an existing file while OneDrive syncs.
        if (isTransientFsError(renameErr)) throw renameErr;
        await unlink(filePath).catch(() => undefined);
        await rename(tmpPath, filePath);
      }
      return;
    } catch (err) {
      lastError = err;
      await unlink(tmpPath).catch(() => undefined);
      if (!isTransientFsError(err) || attempt === attempts - 1) break;
      await sleep(40 * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
