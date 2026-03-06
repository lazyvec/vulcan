export const GATEWAY_PROTOCOL_VERSION = 3;

export type GatewayFrameType = "req" | "res" | "event";

export interface GatewayRequestFrame {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
}

export interface GatewayErrorShape {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;
}

export interface GatewayResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: GatewayErrorShape;
}

export interface GatewayEventFrame {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: {
    presence: number;
    health: number;
  };
}

export type GatewayFrame =
  | GatewayRequestFrame
  | GatewayResponseFrame
  | GatewayEventFrame;

export interface GatewayHelloOk {
  type: "hello-ok";
  protocol: number;
  server: {
    version: string;
    connId: string;
  };
  policy: {
    maxPayload: number;
    maxBufferedBytes: number;
    tickIntervalMs: number;
  };
  features?: {
    methods: string[];
    events: string[];
  };
  snapshot?: unknown;
  auth?: {
    deviceToken: string;
    role: string;
    scopes: string[];
    issuedAtMs?: number;
  };
}

export interface GatewayConnectChallengeEventPayload {
  nonce: string;
  ts?: number;
}

export interface GatewayClientStatus {
  url: string;
  connected: boolean;
  connecting: boolean;
  pendingRequests: number;
  reconnectInMs: number | null;
  protocol: number | null;
  lastError: string | null;
  lastCloseCode: number | null;
  lastCloseReason: string | null;
  lastConnectedAt: number | null;
  lastChallengeAt: number | null;
  attempts: number;
}

export function isGatewayResponseFrame(value: unknown): value is GatewayResponseFrame {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { type?: unknown }).type === "res" &&
      typeof (value as { id?: unknown }).id === "string" &&
      typeof (value as { ok?: unknown }).ok === "boolean",
  );
}

export function isGatewayEventFrame(value: unknown): value is GatewayEventFrame {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { type?: unknown }).type === "event" &&
      typeof (value as { event?: unknown }).event === "string",
  );
}

export function isGatewayHelloOk(value: unknown): value is GatewayHelloOk {
  if (!value || typeof value !== "object") {
    return false;
  }
  const hello = value as GatewayHelloOk;
  return hello.type === "hello-ok" && typeof hello.protocol === "number";
}
