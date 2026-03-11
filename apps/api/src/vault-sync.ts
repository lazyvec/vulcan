import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_VAULT_SYNC_SCRIPT_PATH = "/home/linuxuser/scripts/vault-bisync.sh";
const DEFAULT_VAULT_SYNC_TIMEOUT_MS = 120_000;

export function getVaultSyncScriptPath(): string {
  return process.env.VAULT_SYNC_SCRIPT_PATH ?? DEFAULT_VAULT_SYNC_SCRIPT_PATH;
}

export function getVaultSyncTimeoutMs(): number {
  const value = Number(process.env.VAULT_SYNC_TIMEOUT_MS ?? DEFAULT_VAULT_SYNC_TIMEOUT_MS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_VAULT_SYNC_TIMEOUT_MS;
  return value;
}

export async function ensureVaultSyncScriptAccessible(scriptPath = getVaultSyncScriptPath()): Promise<string> {
  await access(scriptPath, constants.X_OK);
  return scriptPath;
}

export async function runVaultSync(): Promise<{ durationMs: number; scriptPath: string }> {
  const scriptPath = await ensureVaultSyncScriptAccessible();
  const startedAt = Date.now();

  await execFileAsync(scriptPath, [], {
    timeout: getVaultSyncTimeoutMs(),
    maxBuffer: 1024 * 1024,
  });

  return {
    durationMs: Date.now() - startedAt,
    scriptPath,
  };
}
