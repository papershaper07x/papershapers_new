import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const context = new AsyncLocalStorage<{ requestId: string }>();
export type Operation = "study.generation" | "study.poll" | "study.assessment" | "study.feedback" | "study.contact" | "study.history" | "study.paper" | "study.result";

export function currentRequestId() { return context.getStore()?.requestId; }

export function writeTrace(event: "http.request" | "backend.request", operation: Operation | "backend", status: number, durationMs: number) {
  console.info(JSON.stringify({ schema: 1, service: "web", event, timestamp: new Date().toISOString(), requestId: currentRequestId(), operation, status, durationMs: Math.round(durationMs) }));
}

export function tracedRoute<Args extends unknown[]>(operation: Operation, handler: (request: Request, ...args: Args) => Promise<Response>) {
  return async (request: Request, ...args: Args) => context.run({ requestId: randomUUID() }, async () => {
    const started = performance.now();
    let response: Response;
    try {
      response = await handler(request, ...args);
    } catch {
      response = Response.json({ error: "This request could not be completed. Please try again later." }, { status: 500 });
    }
    response.headers.set("X-Request-ID", currentRequestId()!);
    writeTrace("http.request", operation, response.status, performance.now() - started);
    return response;
  });
}
