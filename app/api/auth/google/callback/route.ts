import { createSessionRecord, createUser, findUserByEmail, findUserByOAuthIdentity, linkOAuthIdentity } from "../../../../../db/service";
import { hashPassword, randomToken, sessionCookie, sha256 } from "../../../../../lib/auth";
import { GOOGLE_OAUTH_STATE_COOKIE, googleOAuthConfig, googleOAuthStateCookie, googleProfileFromCode, matchesOAuthState, readCookie } from "../../../../../lib/google-oauth";
import { safeAuthDestination } from "../../../../../lib/auth-redirects";

function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({ Location: location, "Referrer-Policy": "no-referrer" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function redirectToAuth(request: Request, reason: string) {
  return redirect(new URL(`/auth?mode=login&google=${reason}`, request.url).toString(), [googleOAuthStateCookie("", request.url, new Date(0))]);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = googleOAuthConfig(request.url);
  const [state, encodedNext] = (url.searchParams.get("state") ?? "").split(".", 2);
  if (!config || url.searchParams.get("error") || !matchesOAuthState(readCookie(request, GOOGLE_OAUTH_STATE_COOKIE), state)) return redirectToAuth(request, "cancelled");
  const code = url.searchParams.get("code");
  if (!code) return redirectToAuth(request, "unavailable");

  const profile = await googleProfileFromCode(config, code).catch(() => null);
  if (!profile) return redirectToAuth(request, "unavailable");

  let user = await findUserByOAuthIdentity("google", profile.subject);
  if (!user) {
    const existing = await findUserByEmail(profile.email);
    if (existing) {
      user = await linkOAuthIdentity({ userId: existing.id, provider: "google", providerSubject: profile.subject, email: profile.email });
      if (!user || user.id !== existing.id) return redirectToAuth(request, "unavailable");
    } else {
      const password = await hashPassword(randomToken());
      const displayName = profile.name || profile.email.split("@")[0].slice(0, 80) || "Paper Shapers learner";
      const created = await createUser({ name: displayName, email: profile.email, passwordHash: password.hash, passwordSalt: password.salt });
      user = await linkOAuthIdentity({ userId: created.id, provider: "google", providerSubject: profile.subject, email: profile.email });
      if (!user || user.id !== created.id) return redirectToAuth(request, "unavailable");
    }
  }

  const token = randomToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await createSessionRecord(user.id, await sha256(token), expires.toISOString());
  let next = "/papershapers/dashboard";
  try { next = safeAuthDestination(decodeURIComponent(encodedNext ?? "")); } catch {}
  return redirect(new URL(next, request.url).toString(), [
    sessionCookie(token, request.url, expires),
    googleOAuthStateCookie("", request.url, new Date(0)),
  ]);
}
