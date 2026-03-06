import type { EventItem } from "@/lib/types";

type Subscriber = (event: EventItem) => void;

const subscribers = new Set<Subscriber>();

export function subscribeEvents(handler: Subscriber) {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

export function publishEvent(event: EventItem) {
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}

export function getSubscriberCount() {
  return subscribers.size;
}
