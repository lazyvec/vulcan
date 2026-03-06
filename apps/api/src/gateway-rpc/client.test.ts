import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import type { GatewayResponseFrame } from "./types";
import { GatewayRpcClient } from "./client";

function toText(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof Buffer) {
    return data.toString("utf8");
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data as Buffer[]).toString("utf8");
  }
  return Buffer.from(data as ArrayBuffer).toString("utf8");
}

function createTempIdentityPath() {
  const dir = mkdtempSync(path.join(tmpdir(), "vulcan-gateway-rpc-"));
  return {
    dir,
    identityPath: path.join(dir, "device.json"),
  };
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs = 20,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) {
      return;
    }
    await sleep(intervalMs);
  }
  throw new Error(`timeout waiting for condition (${timeoutMs}ms)`);
}

async function createWsServer() {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to get ws server address");
  }
  return {
    server,
    url: `ws://127.0.0.1:${address.port}`,
  };
}

test("GatewayRpcClient handshake + agents.list 요청", async (t) => {
  const { dir, identityPath } = createTempIdentityPath();

  const { server, url } = await createWsServer();

  let connectRequestCount = 0;
  const challengeNonce = "nonce-test-1";
  server.on("connection", (socket: WebSocket) => {
    socket.send(
      JSON.stringify({
        type: "event",
        event: "connect.challenge",
        payload: { nonce: challengeNonce, ts: Date.now() },
      }),
    );

    socket.on("message", (raw: RawData) => {
      const frame = JSON.parse(toText(raw)) as {
        id: string;
        method: string;
        params?: Record<string, unknown>;
      };

      if (frame.method === "connect") {
        connectRequestCount += 1;
        const device = frame.params?.device as Record<string, unknown> | undefined;
        assert.equal(frame.params?.minProtocol, 3);
        assert.equal(frame.params?.maxProtocol, 3);
        assert.equal(device?.nonce, challengeNonce);
        assert.equal(typeof device?.signature, "string");

        const connectResponse: GatewayResponseFrame = {
          type: "res",
          id: frame.id,
          ok: true,
          payload: {
            type: "hello-ok",
            protocol: 3,
            server: { version: "test", connId: "conn-1" },
            policy: { maxPayload: 1024 * 1024, maxBufferedBytes: 1024 * 1024, tickIntervalMs: 15000 },
          },
        };
        socket.send(JSON.stringify(connectResponse));
        return;
      }

      if (frame.method === "agents.list") {
        const response: GatewayResponseFrame = {
          type: "res",
          id: frame.id,
          ok: true,
          payload: {
            agents: [{ id: "hermes", name: "Hermes" }],
          },
        };
        socket.send(JSON.stringify(response));
      }
    });
  });

  const client = new GatewayRpcClient({
    url,
    reconnect: false,
    challengeTimeoutMs: 300,
    requestTimeoutMs: 1_500,
    connectTimeoutMs: 1_500,
    deviceIdentityPath: identityPath,
  });
  t.after(async () => {
    client.stop();
    for (const socket of server.clients) {
      socket.terminate();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    rmSync(dir, { recursive: true, force: true });
  });

  client.start();
  await waitFor(() => client.getStatus().connected, 2_000);

  const result = (await client.agentsList()) as { agents?: Array<{ id: string }> };
  assert.equal(result.agents?.[0]?.id, "hermes");
  assert.equal(connectRequestCount, 1);
});

test("GatewayRpcClient 재연결(지수 백오프) 동작", async (t) => {
  const { dir, identityPath } = createTempIdentityPath();

  const { server, url } = await createWsServer();

  let connectCount = 0;
  server.on("connection", (socket: WebSocket) => {
    connectCount += 1;
    socket.send(
      JSON.stringify({
        type: "event",
        event: "connect.challenge",
        payload: { nonce: `nonce-reconnect-${connectCount}`, ts: Date.now() },
      }),
    );

    socket.on("message", (raw: RawData) => {
      const frame = JSON.parse(toText(raw)) as { id: string; method: string };
      if (frame.method !== "connect") {
        return;
      }
      const response: GatewayResponseFrame = {
        type: "res",
        id: frame.id,
        ok: true,
        payload: {
          type: "hello-ok",
          protocol: 3,
          server: { version: "test", connId: `conn-${connectCount}` },
          policy: { maxPayload: 1024 * 1024, maxBufferedBytes: 1024 * 1024, tickIntervalMs: 15000 },
        },
      };
      socket.send(JSON.stringify(response));

      if (connectCount === 1) {
        setTimeout(() => socket.close(1012, "restart"), 30);
      }
    });
  });

  const client = new GatewayRpcClient({
    url,
    reconnect: true,
    reconnectBaseMs: 40,
    reconnectMaxMs: 120,
    challengeTimeoutMs: 300,
    requestTimeoutMs: 1_500,
    connectTimeoutMs: 1_500,
    deviceIdentityPath: identityPath,
  });
  t.after(async () => {
    client.stop();
    for (const socket of server.clients) {
      socket.terminate();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    rmSync(dir, { recursive: true, force: true });
  });

  client.start();
  await waitFor(() => connectCount >= 2 && client.getStatus().connected, 3_000);
  assert.ok(connectCount >= 2);
});

test("GatewayRpcClient challenge timeout 처리", async (t) => {
  const { dir, identityPath } = createTempIdentityPath();

  const { server, url } = await createWsServer();

  server.on("connection", () => {
    // intentionally no connect.challenge event
  });

  const client = new GatewayRpcClient({
    url,
    reconnect: false,
    challengeTimeoutMs: 80,
    requestTimeoutMs: 500,
    connectTimeoutMs: 500,
    deviceIdentityPath: identityPath,
  });
  t.after(async () => {
    client.stop();
    for (const socket of server.clients) {
      socket.terminate();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    rmSync(dir, { recursive: true, force: true });
  });

  client.start();
  await waitFor(
    () => (client.getStatus().lastError ?? "").includes("challenge timeout"),
    2_000,
  );

  const status = client.getStatus();
  assert.equal(status.connected, false);
  assert.match(status.lastError ?? "", /challenge timeout/);
});
