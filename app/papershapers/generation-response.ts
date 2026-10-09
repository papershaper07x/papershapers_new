export async function generationResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!payload || !response.ok) {
    const fallback = response.status === 504 || response.status === 502
      ? "The paper service took too long to respond. Check your saved papers before trying again."
      : "We couldn’t reach the paper service. Please try again shortly.";
    throw new Error(payload?.error || fallback);
  }
  return payload;
}
