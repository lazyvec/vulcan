import IORedis from "ioredis";
import type { EventItem } from "@vulcan/shared/types";

type Subscriber = (event: EventItem) => void;

const subscribers = new Set<Subscriber>();
const EVENT_CHANNEL = "vulcan:events";

let publisher: IORedis | null = null;
let subscriberClient: IORedis | null = null;
let redisSubscribed = false;

function hasRedisPubSubConfig() {
  return Boolean(process.env.REDIS_URL);
}

function publishLocal(event: EventItem) {
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}

function ensureRedisClients() {
  if (!hasRedisPubSubConfig()) {
    return;
  }

  if (!publisher) {
    publisher = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }

  if (!subscriberClient) {
    subscriberClient = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    subscriberClient.on("message", (channel, payload) => {
      if (channel !== EVENT_CHANNEL) {
        return;
      }
      try {
        const event = JSON.parse(payload) as EventItem;
        publishLocal(event);
      } catch (error) {
        console.error("[vulcan-api] failed to parse redis event payload", error);
      }
    });
  }
}

async function ensureRedisSubscribed() {
  if (!hasRedisPubSubConfig()) {
    return;
  }

  ensureRedisClients();
  if (!publisher || !subscriberClient) {
    return;
  }

  if (publisher.status !== "ready") {
    await publisher.connect();
  }

  if (subscriberClient.status !== "ready") {
    await subscriberClient.connect();
  }

  if (!redisSubscribed) {
    await subscriberClient.subscribe(EVENT_CHANNEL);
    redisSubscribed = true;
  }
}

export function subscribeEvents(handler: Subscriber) {
  subscribers.add(handler);
  void ensureRedisSubscribed();
  return () => {
    subscribers.delete(handler);
  };
}

export function publishEvent(event: EventItem) {
  if (!hasRedisPubSubConfig()) {
    publishLocal(event);
    return;
  }

  void ensureRedisSubscribed()
    .then(() => {
      if (!publisher) {
        publishLocal(event);
        return;
      }
      return publisher.publish(EVENT_CHANNEL, JSON.stringify(event));
    })
    .catch((error) => {
      console.error("[vulcan-api] redis publish failed, fallback to local stream", error);
      publishLocal(event);
    });
}

export function getSubscriberCount() {
  return subscribers.size;
}
