const telegramEnv = {
  ...(process.env.TELEGRAM_BOT_TOKEN
    ? { TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN }
    : {}),
  ...(process.env.TELEGRAM_CHAT_ID
    ? { TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID }
    : {}),
};

const gatewayAuthEnv = {
  ...(process.env.OPENCLAW_GATEWAY_TOKEN
    ? { OPENCLAW_GATEWAY_TOKEN: process.env.OPENCLAW_GATEWAY_TOKEN }
    : {}),
  ...(process.env.OPENCLAW_GATEWAY_PASSWORD
    ? { OPENCLAW_GATEWAY_PASSWORD: process.env.OPENCLAW_GATEWAY_PASSWORD }
    : {}),
};

module.exports = {
  apps: [
    {
      name: "vulcan-api",
      cwd: "/home/linuxuser/projects/vulcan",
      script: "pnpm",
      args: "api:start",
      autorestart: true,
      restart_delay: 1500,
      max_restarts: 50,
      kill_timeout: 5000,
      time: true,
      env: {
        NODE_ENV: "production",
        VULCAN_API_PORT: "8787",
        VULCAN_CORS_ORIGIN: "*",
        DATABASE_URL: "",
        REDIS_URL: "",
        OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:18789",
        VULCAN_GATEWAY_CLIENT_ID: "gateway-client",
        VULCAN_GATEWAY_CLIENT_VERSION: "vulcan-api/0.1.0",
        VULCAN_GATEWAY_SCOPES: "operator.admin",
        VULCAN_GATEWAY_RECONNECT_BASE_MS: "1000",
        VULCAN_GATEWAY_RECONNECT_MAX_MS: "30000",
        ...gatewayAuthEnv,
        ...telegramEnv,
      },
      env_production: {
        NODE_ENV: "production",
        VULCAN_API_PORT: "8787",
        VULCAN_CORS_ORIGIN: "*",
        DATABASE_URL: "",
        REDIS_URL: "",
        OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:18789",
        VULCAN_GATEWAY_CLIENT_ID: "gateway-client",
        VULCAN_GATEWAY_CLIENT_VERSION: "vulcan-api/0.1.0",
        VULCAN_GATEWAY_SCOPES: "operator.admin",
        VULCAN_GATEWAY_RECONNECT_BASE_MS: "1000",
        VULCAN_GATEWAY_RECONNECT_MAX_MS: "30000",
        ...gatewayAuthEnv,
        ...telegramEnv,
      },
    },
    {
      name: "vulcan-mc",
      cwd: "/home/linuxuser/projects/vulcan",
      script: "pnpm",
      args: "start",
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 20,
      kill_timeout: 5000,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        NEXT_PUBLIC_VULCAN_WS_URL: "ws://127.0.0.1:8787/api/ws",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: "3001",
        NEXT_PUBLIC_VULCAN_WS_URL: "ws://127.0.0.1:8787/api/ws",
      },
    },
    {
      name: "vulcan-adapter",
      cwd: "/home/linuxuser/projects/vulcan",
      script: "pnpm",
      args: "adapter",
      autorestart: true,
      restart_delay: 1500,
      max_restarts: 50,
      kill_timeout: 5000,
      time: true,
      env: {
        NODE_ENV: "production",
        VULCAN_INGEST_URL: "http://127.0.0.1:8787/api/adapter/ingest",
        OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:18789",
        VULCAN_GATEWAY_CLIENT_ID: "gateway-client",
        VULCAN_GATEWAY_CLIENT_VERSION: "vulcan-adapter/0.1.0",
        VULCAN_GATEWAY_SCOPES: "operator.admin",
        VULCAN_GATEWAY_RECONNECT_BASE_MS: "1000",
        VULCAN_GATEWAY_RECONNECT_MAX_MS: "30000",
        ADAPTER_POLL_MS: "2000",
        ADAPTER_HEARTBEAT_MS: "45000",
        ADAPTER_MAX_EVENTS_PER_MIN: "40",
        ADAPTER_MAX_BATCH: "12",
        ADAPTER_DRY_RUN: "0",
        ...gatewayAuthEnv,
        ...telegramEnv,
      },
      env_production: {
        NODE_ENV: "production",
        VULCAN_INGEST_URL: "http://127.0.0.1:8787/api/adapter/ingest",
        OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:18789",
        VULCAN_GATEWAY_CLIENT_ID: "gateway-client",
        VULCAN_GATEWAY_CLIENT_VERSION: "vulcan-adapter/0.1.0",
        VULCAN_GATEWAY_SCOPES: "operator.admin",
        VULCAN_GATEWAY_RECONNECT_BASE_MS: "1000",
        VULCAN_GATEWAY_RECONNECT_MAX_MS: "30000",
        ADAPTER_POLL_MS: "2000",
        ADAPTER_HEARTBEAT_MS: "45000",
        ADAPTER_MAX_EVENTS_PER_MIN: "40",
        ADAPTER_MAX_BATCH: "12",
        ADAPTER_DRY_RUN: "0",
        ...gatewayAuthEnv,
        ...telegramEnv,
      },
    },
  ],
};
