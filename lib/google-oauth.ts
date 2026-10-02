import { safeAuthDestination } from "./auth-redirects";

export const GOOGLE_OAUTH_STATE_COOKIE = "ps_google_oauth_state";

type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleProfile = {
  subject: string;
  email: string;
  name: string;
};

function hostnameCookieScope(requestUrl: string) {
  const host = new URL(requestUrl).hostname;
  return host === "papershapers.in" || host.endsWith(".papershapers.in") ? "; Domain=.papershapers.in" : "";
}

function secureCookieFlag(requestUrl: string) {
  const host = new URL(requestUrl).hostname;
  return host === "localhost" || host === "127.0.0.1" ? "" : "; Secure";
}

export function googleOAuthIsConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleOAuthConfig(requestUrl: string): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const reqUrl = new URL(requestUrl);
    const local = reqUrl.hostname === "localhost" || reqUrl.hostname === "127.0.0.1";
    
    // Enforce HTTPS for non-local environments
    if (!local && reqUrl.protocol !== "https:") return null;
    
    // Dynamically construct the redirect URI using the incoming request's host.
    // This allows native support for Netlify deploy previews (e.g. https://<hash>--<site>.netlify.app)
    // without requiring dynamic environment variables per preview branch.
    // Google's Cloud Console Authorized Redirect URIs list provides the actual security validation.
    const redirectUri = `${reqUrl.protocol}//${reqUrl.host}/api/auth/google/callback`;
    
    return { clientId, clientSecret, redirectUri };
  } catch {
    return null;
  }
}

export function googleOAuthStateCookie(state: string, requestUrl: string, expires = new Date(Date.now() + 10 * 60 * 1000)) {
  return `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${hostnameCookieScope(requestUrl)}${secureCookieFlag(requestUrl)}`;
}

export function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ?? null;
}

export function matchesOAuthState(expected: string | null, actual: string | null) {
  if (!expected || !actual || expected.length !== actual.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  return mismatch === 0;
}

export function googleAuthorizationUrl(config: GoogleOAuthConfig, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function googleProfileFromCode(config: GoogleOAuthConfig, code: string): Promise<GoogleProfile | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!tokenResponse.ok) return null;
  const tokens = await tokenResponse.json() as { access_token?: unknown };
  if (typeof tokens.access_token !== "string") return null;

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!profileResponse.ok) return null;
  const profile = await profileResponse.json() as { sub?: unknown; email?: unknown; email_verified?: unknown; name?: unknown };
  if (typeof profile.sub !== "string" || typeof profile.email !== "string" || profile.email_verified !== true) return null;
  const email = profile.email.trim().toLowerCase().slice(0, 180);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const name = typeof profile.name === "string" ? profile.name.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  return { subject: profile.sub, email, name };
}

export function oauthResultDestination(next: string | null | undefined) {
  return safeAuthDestination(next);
}
