import { Queue } from "bullmq";

let commandQueue: Queue | null = null;

type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
};

function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL ?? "";
  if (!redisUrl) {
    return null;
  }

  const parsed = new URL(redisUrl);
  const options: RedisConnectionOptions = {
    host: parsed.hostname,
    port: Number(parsed.port || "6379"),
  };

  if (parsed.username) {
    options.username = decodeURIComponent(parsed.username);
  }

  if (parsed.password) {
    options.password = decodeURIComponent(parsed.password);
  }

  const dbFromPath = parsed.pathname.replace("/", "");
  if (dbFromPath) {
    const db = Number(dbFromPath);
    if (Number.isFinite(db)) {
      options.db = db;
    }
  }

  if (parsed.protocol === "rediss:") {
    options.tls = {};
  }

  return options;
}

export function getCommandQueue() {
  const connection = getRedisConnectionOptions();
  if (!connection) {
    return null;
  }

  if (!commandQueue) {
    commandQueue = new Queue("vulcan-commands", { connection });
  }

  return commandQueue;
}

export async function closeQueueResources() {
  if (commandQueue) {
    await commandQueue.close();
    commandQueue = null;
  }
}
