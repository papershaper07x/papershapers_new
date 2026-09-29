import { createSessionRecord, createUser, findUserByEmail } from "../../../../db/service";
import { hashPassword, randomToken, sessionCookie, sha256 } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string };
    const name = body.name?.trim().slice(0, 80) ?? "";
    const email = body.email?.trim().toLowerCase().slice(0, 180) ?? "";
    const password = body.password ?? "";
    if (name.length < 2) return Response.json({ error: "Please enter your name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Use at least 8 characters for your password." }, { status: 400 });
    if (await findUserByEmail(email)) return Response.json({ error: "An account with this email already exists." }, { status: 409 });

    const passwordResult = await hashPassword(password);
    const user = await createUser({ name, email, passwordHash: passwordResult.hash, passwordSalt: passwordResult.salt });
    const token = randomToken();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await createSessionRecord(user.id, await sha256(token), expires.toISOString());
    return Response.json({ user }, { status: 201, headers: { "Set-Cookie": sessionCookie(token, request.url, expires) } });
  } catch (error) {
    console.error("Signup failed", error);
    return Response.json({ error: "We could not create the account. Please try again." }, { status: 500 });
  }
}
