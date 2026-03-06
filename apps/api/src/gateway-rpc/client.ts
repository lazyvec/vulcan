import path from "node:path";
import { randomUUID } from "node:crypto";
import { WebSocket, type RawData } from "ws";
import {
  buildDeviceAuthPayloadV3,
  loadOrCreateDeviceIdentity,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload,
} from "./device-auth";
import {
  GATEWAY_PROTOCOL_VERSION,
  isGatewayEventFrame,
  isGatewayHelloOk,
  isGatewayResponseFrame,
  type GatewayClientStatus,
  type GatewayConnectChallengeEventPayload,
  type GatewayEventFrame,
  type GatewayHelloOk,
} from "./types";

type PendingRequest = {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type ReadyWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type GatewayRpcClientOptions = {
  url?: string;
  token?: string;
  password?: string;
  role?: string;
  scopes?: string[];
  clientId?: string;
  clientVersion?: string;
  clientMode?: string;
  platform?: string;
  deviceFamily?: string;
  instanceId?: string;
  userAgent?: string;
  locale?: string;
  challengeTimeoutMs?: number;
  requestTimeoutMs?: number;
  reconnect?: boolean;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  connectTimeoutMs?: number;
  deviceIdentityPath?: string;
  onEvent?: (event: GatewayEventFrame) => void;
};

type GatewayRpcClientConfig = {
  url: string;
  token?: string;
  password?: string;
  role: string;
  scopes: string[];
  clientId: string;
  clientVersion: string;
  clientMode: string;
  platform: string;
  deviceFamily?: string;
  instanceId?: string;
  userAgent?: string;
  locale?: string;
  challengeTimeoutMs: number;
  requestTimeoutMs: number;
  reconnect: boolean;
  reconnectBaseMs: number;
  reconnectMaxMs: number;
  connectTimeoutMs: number;
  deviceIdentityPath: string;
  onEvent?: (event: GatewayEventFrame) => void;
};

const DEFAULT_URL = "ws://127.0.0.1:18789";
const DEFAULT_ROLE = "operator";
const DEFAULT_CLIENT_ID = "gateway-client";
const DEFAULT_CLIENT_MODE = "backend";
const DEFAULT_CLIENT_VERSION = "dev";
const DEFAULT_SCOPES = ["operator.admin"];

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeScopes(scopes: string[] | undefined): string[] {
  if (!Array.isArray(scopes)) {
    return [...DEFAULT_SCOPES];
  }
  const unique = new Set<string>();
  for (const scope of scopes) {
    const trimmed = scope.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }
  return unique.size ? [...unique].sort() : [...DEFAULT_SCOPES];
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseScopesFromEnv(input: string | undefined): string[] {
  const raw = trimOrUndefined(input);
  if (!raw) {
    return [...DEFAULT_SCOPES];
  }
  return normalizeScopes(raw.split(","));
}

function rawDataToString(data: RawData): string {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof Buffer) {
    return data.toString("utf8");
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf8");
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  }
  return String(data);
}

function createDefaultIdentityPath() {
  return path.resolve(process.cwd(), ".vulcan", "gateway-device.json");
}

export class GatewayRpcClient {
  private readonly config: GatewayRpcClientConfig;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly readyWaiters = new Set<ReadyWaiter>();
  private readonly deviceIdentity;
  private ws: WebSocket | null = null;
  private challengeTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectNonce: string | null = null;
  private connectSent = false;
  private stopped = false;
  private backoffMs: number;
  private status: GatewayClientStatus;

  constructor(options: GatewayRpcClientOptions = {}) {
    this.config = {
      url: trimOrUndefined(options.url) ?? DEFAULT_URL,
      token: trimOrUndefined(options.token),
      password: trimOrUndefined(options.password),
      role: trimOrUndefined(options.role) ?? DEFAULT_ROLE,
      scopes: normalizeScopes(options.scopes),
      clientId: trimOrUndefined(options.clientId) ?? DEFAULT_CLIENT_ID,
      clientVersion: trimOrUndefined(options.clientVersion) ?? DEFAULT_CLIENT_VERSION,
      clientMode: trimOrUndefined(options.clientMode) ?? DEFAULT_CLIENT_MODE,
      platform: trimOrUndefined(options.platform) ?? process.platform,
      deviceFamily: trimOrUndefined(options.deviceFamily),
      instanceId: trimOrUndefined(options.instanceId),
      userAgent: trimOrUndefined(options.userAgent),
      locale: trimOrUndefined(options.locale),
      challengeTimeoutMs: options.challengeTimeoutMs ?? 2_000,
      requestTimeoutMs: options.requestTimeoutMs ?? 10_000,
      reconnect: options.reconnect !== false,
      reconnectBaseMs: options.reconnectBaseMs ?? 1_000,
      reconnectMaxMs: options.reconnectMaxMs ?? 30_000,
      connectTimeoutMs: options.connectTimeoutMs ?? 8_000,
      deviceIdentityPath: options.deviceIdentityPath ?? createDefaultIdentityPath(),
      onEvent: options.onEvent,
    };

    this.deviceIdentity = loadOrCreateDeviceIdentity(this.config.deviceIdentityPath);
    this.backoffMs = this.config.reconnectBaseMs;
    this.status = {
      url: this.config.url,
      connected: false,
      connecting: false,
      pendingRequests: 0,
      reconnectInMs: null,
      protocol: null,
      lastError: null,
      lastCloseCode: null,
      lastCloseReason: null,
      lastConnectedAt: null,
      lastChallengeAt: null,
      attempts: 0,
    };
  }

  start() {
    if (this.stopped) {
      this.stopped = false;
    }
    if (this.ws || this.status.connecting) {
      return;
    }
    this.openSocket();
  }

  stop() {
    this.stopped = true;
    this.clearChallengeTimer();
    this.clearReconnectTimer();
    this.connectNonce = null;
    this.connectSent = false;

    if (this.ws) {
      try {
        this.ws.close(1000, "stopped");
      } catch {
        // Ignore close errors.
      }
      this.ws = null;
    }

    this.status.connected = false;
    this.status.connecting = false;
    this.status.reconnectInMs = null;
    this.status.pendingRequests = 0;

    this.rejectAllPending(new Error("gateway client stopped"));
    this.rejectReadyWaiters(new Error("gateway client stopped"));
  }

  getStatus(): GatewayClientStatus {
    return {
      ...this.status,
      pendingRequests: this.pending.size,
    };
  }

  async call<T = unknown>(method: string, params?: unknown): Promise<T> {
    return this.request<T>(method, params);
  }

  async request<T = unknown>(
    method: string,
    params?: unknown,
    opts?: { requestTimeoutMs?: number; connectTimeoutMs?: number },
  ): Promise<T> {
    await this.ensureReady(opts?.connectTimeoutMs ?? this.config.connectTimeoutMs);
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }
    const timeoutMs = opts?.requestTimeoutMs ?? this.config.requestTimeoutMs;
    return this.requestRaw<T>(ws, method, params, timeoutMs);
  }

  agentsList(params: Record<string, unknown> = {}) {
    return this.request("agents.list", params);
  }

  agentsCreate(params: Record<string, unknown>) {
    return this.request("agents.create", params);
  }

  agentsUpdate(params: Record<string, unknown>) {
    return this.request("agents.update", params);
  }

  agentsDelete(params: Record<string, unknown>) {
    return this.request("agents.delete", params);
  }

  chatSend(params: Record<string, unknown>) {
    return this.request("chat.send", params);
  }

  chatAbort(params: Record<string, unknown>) {
    return this.request("chat.abort", params);
  }

  chatHistory(params: Record<string, unknown>) {
    return this.request("chat.history", params);
  }

  sessionsList(params: Record<string, unknown> = {}) {
    return this.request("sessions.list", params);
  }

  sessionsPatch(params: Record<string, unknown>) {
    return this.request("sessions.patch", params);
  }

  sessionsReset(params: Record<string, unknown>) {
    return this.request("sessions.reset", params);
  }

  configGet(params: Record<string, unknown> = {}) {
    return this.request("config.get", params);
  }

  configPatch(params: Record<string, unknown>) {
    return this.request("config.patch", params);
  }

  cronList(params: Record<string, unknown> = {}) {
    return this.request("cron.list", params);
  }

  cronStatus(params: Record<string, unknown> = {}) {
    return this.request("cron.status", params);
  }

  private openSocket() {
    this.status.connecting = true;
    this.status.connected = false;
    this.status.reconnectInMs = null;
    this.status.attempts += 1;
    this.connectNonce = null;
    this.connectSent = false;

    const ws = new WebSocket(this.config.url, { maxPayload: 25 * 1024 * 1024 });
    this.ws = ws;

    ws.on("open", () => {
      if (this.ws !== ws) {
        return;
      }
      this.queueChallengeTimeout(ws);
    });

    ws.on("message", (data: RawData) => {
      if (this.ws !== ws) {
        return;
      }
      this.handleMessage(ws, rawDataToString(data));
    });

    ws.on("close", (code: number, reasonRaw: Buffer) => {
      if (this.ws !== ws) {
        return;
      }
      this.handleClose(code, rawDataToString(reasonRaw));
    });

    ws.on("error", (error: Error) => {
      if (this.ws !== ws) {
        return;
      }
      this.status.lastError = toErrorMessage(error);
    });
  }

  private queueChallengeTimeout(ws: WebSocket) {
    this.clearChallengeTimer();
    this.challengeTimer = setTimeout(() => {
      if (this.ws !== ws || this.connectSent) {
        return;
      }
      this.status.lastError = "gateway connect challenge timeout";
      try {
        ws.close(1008, "connect challenge timeout");
      } catch {
        // Ignore close errors.
      }
    }, this.config.challengeTimeoutMs);
  }

  private clearChallengeTimer() {
    if (!this.challengeTimer) {
      return;
    }
    clearTimeout(this.challengeTimer);
    this.challengeTimer = null;
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private handleMessage(ws: WebSocket, raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (isGatewayEventFrame(parsed)) {
      if (parsed.event === "connect.challenge") {
        const payload = parsed.payload as GatewayConnectChallengeEventPayload | undefined;
        const nonce = typeof payload?.nonce === "string" ? payload.nonce.trim() : "";
        if (!nonce) {
          this.status.lastError = "gateway connect challenge missing nonce";
          try {
            ws.close(1008, "connect challenge missing nonce");
          } catch {
            // Ignore close errors.
          }
          return;
        }

        this.status.lastChallengeAt = Date.now();
        this.connectNonce = nonce;
        this.sendConnect(ws, nonce);
        return;
      }

      this.config.onEvent?.(parsed);
      return;
    }

    if (!isGatewayResponseFrame(parsed)) {
      return;
    }

    const pending = this.pending.get(parsed.id);
    if (!pending) {
      return;
    }

    this.pending.delete(parsed.id);
    clearTimeout(pending.timer);

    if (parsed.ok) {
      pending.resolve(parsed.payload);
      return;
    }

    const code = parsed.error?.code ? `[${parsed.error.code}] ` : "";
    const message = parsed.error?.message ?? "gateway request failed";
    pending.reject(new Error(`${code}${message}`.trim()));
  }

  private sendConnect(ws: WebSocket, nonce: string) {
    if (this.connectSent) {
      return;
    }
    this.connectSent = true;
    this.clearChallengeTimer();

    const signedAtMs = Date.now();
    const authToken = this.config.token;
    const auth = authToken || this.config.password
      ? {
          token: authToken,
          password: this.config.password,
        }
      : undefined;

    const signaturePayload = buildDeviceAuthPayloadV3({
      deviceId: this.deviceIdentity.deviceId,
      clientId: this.config.clientId,
      clientMode: this.config.clientMode,
      role: this.config.role,
      scopes: this.config.scopes,
      signedAtMs,
      token: authToken ?? null,
      nonce,
      platform: this.config.platform,
      deviceFamily: this.config.deviceFamily,
    });
    const signature = signDevicePayload(this.deviceIdentity.privateKeyPem, signaturePayload);

    const connectParams = {
      minProtocol: GATEWAY_PROTOCOL_VERSION,
      maxProtocol: GATEWAY_PROTOCOL_VERSION,
      client: {
        id: this.config.clientId,
        version: this.config.clientVersion,
        platform: this.config.platform,
        deviceFamily: this.config.deviceFamily,
        mode: this.config.clientMode,
        instanceId: this.config.instanceId,
      },
      role: this.config.role,
      scopes: this.config.scopes,
      caps: [],
      commands: [],
      permissions: {},
      auth,
      locale: this.config.locale,
      userAgent: this.config.userAgent,
      device: {
        id: this.deviceIdentity.deviceId,
        publicKey: publicKeyRawBase64UrlFromPem(this.deviceIdentity.publicKeyPem),
        signature,
        signedAt: signedAtMs,
        nonce,
      },
    };

    void this.requestRaw<GatewayHelloOk>(ws, "connect", connectParams, this.config.requestTimeoutMs)
      .then((hello) => {
        if (!isGatewayHelloOk(hello)) {
          throw new Error("invalid connect response");
        }
        this.status.connected = true;
        this.status.connecting = false;
        this.status.protocol = hello.protocol;
        this.status.lastConnectedAt = Date.now();
        this.status.lastError = null;
        this.backoffMs = this.config.reconnectBaseMs;
        this.resolveReadyWaiters();
      })
      .catch((error) => {
        this.status.lastError = `gateway connect failed: ${toErrorMessage(error)}`;
        this.status.connected = false;
        this.status.connecting = false;
        this.rejectReadyWaiters(new Error(this.status.lastError));
        try {
          ws.close(1008, "connect failed");
        } catch {
          // Ignore close errors.
        }
      });
  }

  private handleClose(code: number, reason: string) {
    this.ws = null;
    this.clearChallengeTimer();
    this.connectSent = false;
    this.connectNonce = null;

    this.status.connected = false;
    this.status.connecting = false;
    this.status.lastCloseCode = code;
    this.status.lastCloseReason = reason || null;

    this.rejectAllPending(new Error(`gateway closed (${code}): ${reason || "no reason"}`));

    if (this.stopped) {
      return;
    }

    if (!this.config.reconnect) {
      this.rejectReadyWaiters(new Error("gateway disconnected and reconnect is disabled"));
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.stopped) {
      return;
    }

    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.config.reconnectMaxMs);
    this.status.reconnectInMs = delay;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.status.reconnectInMs = null;
      this.openSocket();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private requestRaw<T>(
    ws: WebSocket,
    method: string,
    params: unknown,
    timeoutMs: number,
  ): Promise<T> {
    if (this.ws !== ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("gateway not connected"));
    }

    const id = randomUUID();
    const frame = {
      type: "req" as const,
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`gateway request timeout: ${method}`));
      }, timeoutMs);
      timer.unref?.();

      this.pending.set(id, {
        method,
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      this.status.pendingRequests = this.pending.size;

      try {
        ws.send(JSON.stringify(frame));
      } catch (error) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(new Error(`gateway request send failed: ${toErrorMessage(error)}`));
      }
    });
  }

  private ensureReady(timeoutMs: number): Promise<void> {
    if (this.status.connected) {
      return Promise.resolve();
    }

    if (!this.ws && !this.status.connecting) {
      this.start();
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyWaiters.delete(waiter);
        reject(new Error(`gateway connect timeout (${timeoutMs}ms)`));
      }, timeoutMs);
      timer.unref?.();

      const waiter: ReadyWaiter = {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          reject(error);
        },
        timer,
      };

      this.readyWaiters.add(waiter);
    });
  }

  private resolveReadyWaiters() {
    for (const waiter of this.readyWaiters) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
    this.readyWaiters.clear();
  }

  private rejectReadyWaiters(error: Error) {
    for (const waiter of this.readyWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.readyWaiters.clear();
  }

  private rejectAllPending(error: Error) {
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.status.pendingRequests = 0;
  }
}

export function createGatewayRpcClientFromEnv(
  options: Pick<GatewayRpcClientOptions, "onEvent"> = {},
) {
  const version = process.env.npm_package_version ?? DEFAULT_CLIENT_VERSION;
  const clientVersion = trimOrUndefined(process.env.VULCAN_GATEWAY_CLIENT_VERSION) ?? `vulcan-api/${version}`;
  const connectTimeoutMs = parsePositiveNumber(
    process.env.VULCAN_GATEWAY_CONNECT_TIMEOUT_MS,
    8_000,
  );

  return new GatewayRpcClient({
    url: trimOrUndefined(process.env.OPENCLAW_GATEWAY_URL) ?? DEFAULT_URL,
    token: trimOrUndefined(process.env.OPENCLAW_GATEWAY_TOKEN),
    password: trimOrUndefined(process.env.OPENCLAW_GATEWAY_PASSWORD),
    role: trimOrUndefined(process.env.VULCAN_GATEWAY_ROLE) ?? DEFAULT_ROLE,
    scopes: parseScopesFromEnv(process.env.VULCAN_GATEWAY_SCOPES),
    clientId: trimOrUndefined(process.env.VULCAN_GATEWAY_CLIENT_ID) ?? DEFAULT_CLIENT_ID,
    clientVersion,
    clientMode: trimOrUndefined(process.env.VULCAN_GATEWAY_CLIENT_MODE) ?? DEFAULT_CLIENT_MODE,
    platform: trimOrUndefined(process.env.VULCAN_GATEWAY_PLATFORM) ?? process.platform,
    deviceFamily: trimOrUndefined(process.env.VULCAN_GATEWAY_DEVICE_FAMILY),
    instanceId: trimOrUndefined(process.env.VULCAN_GATEWAY_INSTANCE_ID),
    userAgent: trimOrUndefined(process.env.VULCAN_GATEWAY_USER_AGENT) ?? `vulcan-api/${version}`,
    locale: trimOrUndefined(process.env.VULCAN_GATEWAY_LOCALE),
    challengeTimeoutMs: parsePositiveNumber(
      process.env.VULCAN_GATEWAY_CHALLENGE_TIMEOUT_MS,
      2_000,
    ),
    requestTimeoutMs: parsePositiveNumber(
      process.env.VULCAN_GATEWAY_REQUEST_TIMEOUT_MS,
      10_000,
    ),
    reconnectBaseMs: parsePositiveNumber(
      process.env.VULCAN_GATEWAY_RECONNECT_BASE_MS,
      1_000,
    ),
    reconnectMaxMs: parsePositiveNumber(
      process.env.VULCAN_GATEWAY_RECONNECT_MAX_MS,
      30_000,
    ),
    connectTimeoutMs,
    deviceIdentityPath:
      trimOrUndefined(process.env.VULCAN_GATEWAY_DEVICE_IDENTITY_PATH) ??
      createDefaultIdentityPath(),
    reconnect: process.env.VULCAN_GATEWAY_RECONNECT !== "0",
    onEvent: options.onEvent,
  });
}
