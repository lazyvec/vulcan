import { beforeEach, describe, expect, it, vi } from "vitest";

const accessMock = vi.fn();
const execFileMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  access: accessMock,
  constants: {
    X_OK: 1,
  },
}));

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

describe("vault-sync", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.VAULT_SYNC_SCRIPT_PATH;
    delete process.env.VAULT_SYNC_TIMEOUT_MS;
  });

  it("환경변수가 없으면 기본 스크립트 경로를 사용한다", async () => {
    const mod = await import("./vault-sync");
    expect(mod.getVaultSyncScriptPath()).toBe("/home/linuxuser/scripts/vault-bisync.sh");
  });

  it("runVaultSync는 스크립트 실행 전 접근 가능 여부를 확인한다", async () => {
    accessMock.mockResolvedValue(undefined);
    execFileMock.mockImplementation((_file, _args, _options, cb) => cb(null, "", ""));

    const mod = await import("./vault-sync");
    const result = await mod.runVaultSync();

    expect(accessMock).toHaveBeenCalledWith("/home/linuxuser/scripts/vault-bisync.sh", 1);
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(result.scriptPath).toBe("/home/linuxuser/scripts/vault-bisync.sh");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("timeout 환경변수를 execFile 옵션에 반영한다", async () => {
    process.env.VAULT_SYNC_SCRIPT_PATH = "/tmp/custom-sync.sh";
    process.env.VAULT_SYNC_TIMEOUT_MS = "3456";
    accessMock.mockResolvedValue(undefined);
    execFileMock.mockImplementation((_file, _args, _options, cb) => cb(null, "", ""));

    const mod = await import("./vault-sync");
    await mod.runVaultSync();

    expect(execFileMock).toHaveBeenCalledWith(
      "/tmp/custom-sync.sh",
      [],
      expect.objectContaining({
        timeout: 3456,
        maxBuffer: 1024 * 1024,
      }),
      expect.any(Function),
    );
  });
});
