import assert from "node:assert/strict";
import test from "node:test";
import type { GatewayEventFrame } from "./types";
import {
  buildEventFingerprint,
  detectAgentIdFromGatewayEvent,
  mapGatewayEventNameToType,
  mapGatewayEventToIngest,
} from "./event-adapter";

test("mapGatewayEventToIngest: connect.challenge/tick 무시", () => {
  const challenge = mapGatewayEventToIngest({
    type: "event",
    event: "connect.challenge",
    payload: { nonce: "x" },
  });
  const tick = mapGatewayEventToIngest({
    type: "event",
    event: "tick",
    payload: { ts: Date.now() },
  });

  assert.equal(challenge, null);
  assert.equal(tick, null);
});

test("mapGatewayEventNameToType: chat/error/exec 분류", () => {
  assert.equal(mapGatewayEventNameToType("chat", { message: "hello" }), "message");
  assert.equal(mapGatewayEventNameToType("exec.approval.requested", {}), "tool_call");
  assert.equal(mapGatewayEventNameToType("presence", { level: "error" }), "error");
});

test("detectAgentIdFromGatewayEvent: agentId/sessionKey 파싱", () => {
  assert.equal(
    detectAgentIdFromGatewayEvent("chat", { agentId: "Hermes" }),
    "hermes",
  );
  assert.equal(
    detectAgentIdFromGatewayEvent("sessions.update", { sessionKey: "agent:atlas:main" }),
    "atlas",
  );
  assert.equal(detectAgentIdFromGatewayEvent("chat", { sessionKey: "main" }), null);
});

test("mapGatewayEventToIngest: payload 변환 + fingerprint", () => {
  const frame: GatewayEventFrame = {
    type: "event",
    event: "chat",
    payload: {
      message: "Hermes replied",
      sessionKey: "agent:hermes:main",
    },
    seq: 12,
  };

  const mapped = mapGatewayEventToIngest(frame);
  assert.ok(mapped);
  assert.equal(mapped?.source, "openclaw-gateway");
  assert.equal(mapped?.type, "message");
  assert.equal(mapped?.agentId, "hermes");
  assert.match(mapped?.summary ?? "", /\[gateway:chat\]/);
  assert.match(mapped?.payloadJson ?? "", /"seq":12/);

  const fingerprint = buildEventFingerprint(mapped!);
  assert.equal(typeof fingerprint, "string");
  assert.equal(fingerprint.length, 40);
});
