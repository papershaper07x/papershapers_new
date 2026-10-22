export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ service: "web", commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || process.env.GIT_COMMIT || "local", release: "2026-10-21-production-audit" }, { headers: { "Cache-Control": "no-store" } });
}
