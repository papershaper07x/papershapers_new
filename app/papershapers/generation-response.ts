export async function generationResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!payload || !response.ok) {
    const fallback = response.status === 504 || response.status === 502
      ? "The paper service took too long to respond. Check your saved papers before trying again."
      : "We couldn’t reach the paper service. Please try again shortly.";
    const requestId = response.headers.get("X-Request-ID");
    const reference = requestId && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId) ? ` Support reference: ${requestId}.` : "";
    throw new Error((payload?.error || fallback) + reference);
  }
  return payload;
}
