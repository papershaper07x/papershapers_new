export function rejectCrossOrigin(request: Request) {
  return request.headers.get("origin") !== new URL(request.url).origin
    ? Response.json({ error: "Use the form on this website." }, { status: 403 }) : null;
}

export class BodyTooLargeError extends Error {}
export async function readBoundedText(request: Request, maxBytes: number) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new BodyTooLargeError("Request is too large."); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
