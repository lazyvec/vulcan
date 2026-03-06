import { execSync } from "node:child_process";

const startedAt = Date.now();

let cachedGitSha = "unknown";
try {
  cachedGitSha = execSync("git rev-parse --short HEAD", {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
} catch {
  cachedGitSha = process.env.GIT_SHA ?? "unknown";
}

export function getRuntimeInfo() {
  return {
    startedAt,
    uptimeMs: Date.now() - startedAt,
    gitSha: process.env.GIT_SHA ?? cachedGitSha,
    build: process.env.npm_package_version ?? "0.0.0",
  };
}
