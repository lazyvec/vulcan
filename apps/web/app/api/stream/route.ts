import { subscribeEvents } from "@/lib/event-stream";
import { getLatestEvents } from "@/lib/store";

export const runtime = "nodejs";

export function GET() {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const seed = getLatestEvents(8);
      for (const event of seed) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      const unsubscribe = subscribeEvents((event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15000);

      cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };

      controller.enqueue(encoder.encode(`event: ready\ndata: {"ok":true}\n\n`));
    },
    cancel() {
      if (cleanup) {
        cleanup();
      }
      return;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
