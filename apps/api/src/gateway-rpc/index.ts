import type { GatewayEventFrame } from "./types";
import { createGatewayRpcClientFromEnv, type GatewayRpcClient } from "./client";

let gatewayRpcClient: GatewayRpcClient | null = null;

export function getGatewayRpcClient(options: { onEvent?: (event: GatewayEventFrame) => void } = {}) {
  if (!gatewayRpcClient) {
    gatewayRpcClient = createGatewayRpcClientFromEnv({ onEvent: options.onEvent });
    gatewayRpcClient.start();
  }
  return gatewayRpcClient;
}
