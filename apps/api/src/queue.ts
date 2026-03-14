import type { AgentCommandMode } from "@vulcan/shared/types";
import { Queue, Worker } from "bullmq";

const COMMAND_QUEUE_NAME = "vulcan-commands";
const HEALTHCHECK_QUEUE_NAME = "vulcan-healthchecks";
const NOTIFICATION_QUEUE_NAME = "vulcan-notifications";
const WO_DISPATCH_QUEUE_NAME = "vulcan-wo-dispatch";

export type CommandQueueJobData = {
  commandId: string;
  mode: AgentCommandMode;
  agentId: string;
  message: string;
  to?: string;
  taskLabel?: string;
  metadata?: Record<string, unknown>;
};

export type HealthcheckQueueJobData = {
  check: "gateway-status";
};

export type NotificationQueueJobData = {
  chatId: string;
  eventType: string;
  message: string;
};

export type WoDispatchJobData = {
  workOrderId: string;
};

type QueueWorkerHandlers = {
  command: (payload: CommandQueueJobData) => Promise<void>;
  healthcheck: (payload: HealthcheckQueueJobData) => Promise<void>;
  notification: (payload: NotificationQueueJobData) => Promise<void>;
  woDispatch: (payload: WoDispatchJobData) => Promise<void>;
};

let commandQueue: Queue<CommandQueueJobData> | null = null;
let healthcheckQueue: Queue<HealthcheckQueueJobData> | null = null;
let notificationQueue: Queue<NotificationQueueJobData> | null = null;
let woDispatchQueue: Queue<WoDispatchJobData> | null = null;
let commandWorker: Worker<CommandQueueJobData> | null = null;
let healthcheckWorker: Worker<HealthcheckQueueJobData> | null = null;
let notificationWorker: Worker<NotificationQueueJobData> | null = null;
let woDispatchWorker: Worker<WoDispatchJobData> | null = null;

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
    commandQueue = new Queue<CommandQueueJobData>(COMMAND_QUEUE_NAME, { connection });
  }

  return commandQueue;
}

export function getHealthcheckQueue() {
  const connection = getRedisConnectionOptions();
  if (!connection) {
    return null;
  }

  if (!healthcheckQueue) {
    healthcheckQueue = new Queue<HealthcheckQueueJobData>(HEALTHCHECK_QUEUE_NAME, { connection });
  }

  return healthcheckQueue;
}

export function getNotificationQueue() {
  const connection = getRedisConnectionOptions();
  if (!connection) {
    return null;
  }

  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationQueueJobData>(NOTIFICATION_QUEUE_NAME, { connection });
  }

  return notificationQueue;
}

export function getWoDispatchQueue() {
  const connection = getRedisConnectionOptions();
  if (!connection) {
    return null;
  }

  if (!woDispatchQueue) {
    woDispatchQueue = new Queue<WoDispatchJobData>(WO_DISPATCH_QUEUE_NAME, { connection });
  }

  return woDispatchQueue;
}

export function startQueueWorkers(handlers: QueueWorkerHandlers) {
  const connection = getRedisConnectionOptions();
  if (!connection) {
    return false;
  }

  if (!commandWorker) {
    commandWorker = new Worker<CommandQueueJobData>(
      COMMAND_QUEUE_NAME,
      async (job) => {
        await handlers.command(job.data);
      },
      {
        connection,
        concurrency: 2,
      },
    );

    commandWorker.on("failed", (job, error) => {
      console.error("[vulcan-api] command queue worker failed", {
        jobId: job?.id ?? null,
        error: error.message,
      });
    });
  }

  if (!healthcheckWorker) {
    healthcheckWorker = new Worker<HealthcheckQueueJobData>(
      HEALTHCHECK_QUEUE_NAME,
      async (job) => {
        await handlers.healthcheck(job.data);
      },
      {
        connection,
        concurrency: 1,
      },
    );

    healthcheckWorker.on("failed", (job, error) => {
      console.error("[vulcan-api] healthcheck queue worker failed", {
        jobId: job?.id ?? null,
        error: error.message,
      });
    });
  }

  if (!notificationWorker) {
    notificationWorker = new Worker<NotificationQueueJobData>(
      NOTIFICATION_QUEUE_NAME,
      async (job) => {
        await handlers.notification(job.data);
      },
      {
        connection,
        concurrency: 1,
      },
    );

    notificationWorker.on("failed", (job, error) => {
      console.error("[vulcan-api] notification queue worker failed", {
        jobId: job?.id ?? null,
        error: error.message,
      });
    });
  }

  if (!woDispatchWorker) {
    woDispatchWorker = new Worker<WoDispatchJobData>(
      WO_DISPATCH_QUEUE_NAME,
      async (job) => {
        await handlers.woDispatch(job.data);
      },
      {
        connection,
        concurrency: 1,
      },
    );

    woDispatchWorker.on("failed", (job, error) => {
      console.error("[vulcan-api] wo-dispatch queue worker failed", {
        jobId: job?.id ?? null,
        error: error.message,
      });
    });
  }

  return true;
}

export async function enqueueCommandJob(payload: CommandQueueJobData) {
  const queue = getCommandQueue();
  if (!queue) {
    return false;
  }

  await queue.add("agent-command", payload, {
    jobId: payload.commandId,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1_000,
    },
    removeOnComplete: 200,
    removeOnFail: 500,
  });

  return true;
}

export async function enqueueHealthcheckJob(payload: HealthcheckQueueJobData = { check: "gateway-status" }) {
  const queue = getHealthcheckQueue();
  if (!queue) {
    return false;
  }

  await queue.add("gateway-healthcheck", payload, {
    jobId: `gateway-healthcheck-${Math.floor(Date.now() / 30_000)}`,
    removeOnComplete: 100,
    removeOnFail: 100,
  });

  return true;
}

export async function enqueueNotificationJob(payload: NotificationQueueJobData) {
  const queue = getNotificationQueue();
  if (!queue) {
    return false;
  }

  await queue.add("telegram-notification", payload, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2_000,
    },
    removeOnComplete: 200,
    removeOnFail: 500,
  });

  return true;
}

export async function enqueueWoDispatchJob(payload: WoDispatchJobData) {
  const queue = getWoDispatchQueue();
  if (!queue) {
    return false;
  }

  await queue.add("wo-dispatch", payload, {
    jobId: `wo-dispatch-${payload.workOrderId}`,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2_000,
    },
    removeOnComplete: 200,
    removeOnFail: 500,
  });

  return true;
}

export async function closeQueueResources() {
  if (commandWorker) {
    await commandWorker.close();
    commandWorker = null;
  }

  if (healthcheckWorker) {
    await healthcheckWorker.close();
    healthcheckWorker = null;
  }

  if (commandQueue) {
    await commandQueue.close();
    commandQueue = null;
  }

  if (healthcheckQueue) {
    await healthcheckQueue.close();
    healthcheckQueue = null;
  }

  if (notificationWorker) {
    await notificationWorker.close();
    notificationWorker = null;
  }

  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }

  if (woDispatchWorker) {
    await woDispatchWorker.close();
    woDispatchWorker = null;
  }

  if (woDispatchQueue) {
    await woDispatchQueue.close();
    woDispatchQueue = null;
  }
}
