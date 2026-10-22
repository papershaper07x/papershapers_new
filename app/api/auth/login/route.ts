import { rejectCrossOrigin } from "../../../../lib/request-safety";
import { withinRequestLimit, rateLimitResponse } from "../../../../lib/request-limit";
import { createSessionRecord, findUserByEmail } from "../../../../db/service";
import { randomToken, sessionCookie, sha256, verifyPassword } from "../../../../lib/auth";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request); if (rejected) return rejected;
  try {
    const body = await request.json().catch(() => null) as { email?: string; password?: string };
    if (!body || typeof body.email !== "string" || typeof body.password !== "string" || body.password.length > 256) return Response.json({ error: "Enter valid account details. Passwords may contain up to 256 characters." }, { status: 400 });
    const email = body.email?.trim().toLowerCase().slice(0, 180) ?? "";
    const password = body.password ?? "";
    if (!await withinRequestLimit("auth-login", email, 10, 900)) return rateLimitResponse(900);
    const found = await findUserByEmail(email);
    if (!found || !(await verifyPassword(password, found.password_salt, found.password_hash))) {
      return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const token = randomToken();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await createSessionRecord(found.id, await sha256(token), expires.toISOString());
    const user = { id: found.id, name: found.name, email: found.email, createdAt: found.created_at };
    return Response.json({ user }, { headers: { "Set-Cookie": sessionCookie(token, request.url, expires) } });
  } catch (error) {
    console.error("Login failed", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ error: "We could not sign you in. Please try again." }, { status: 500 });
  }
}
