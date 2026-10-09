export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ service: "web", commit: process.env.COMMIT_REF || process.env.GIT_COMMIT || "local", release: "2026-10-09-student-hardening" }, { headers: { "Cache-Control": "no-store" } });
}
