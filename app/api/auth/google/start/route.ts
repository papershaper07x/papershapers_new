import { googleAuthorizationUrl, googleOAuthConfig, googleOAuthStateCookie, oauthResultDestination } from "../../../../../lib/google-oauth";
import { randomToken } from "../../../../../lib/auth";

function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({ Location: location, "Referrer-Policy": "no-referrer" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

export async function GET(request: Request) {
  const config = googleOAuthConfig(request.url);
  if (!config) return redirect(new URL("/auth?mode=login", request.url).toString());
  const state = randomToken();
  const next = oauthResultDestination(new URL(request.url).searchParams.get("next"));
  return redirect(googleAuthorizationUrl(config, `${state}.${encodeURIComponent(next)}`), [googleOAuthStateCookie(state, request.url)]);
}
