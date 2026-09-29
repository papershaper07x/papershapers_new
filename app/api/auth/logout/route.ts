import { deleteSession } from "../../../../db/service";
import { expiredSessionCookie, readSessionToken, sha256 } from "../../../../lib/auth";

export async function POST(request: Request) {
  const token = readSessionToken(request);
  if (token) await deleteSession(await sha256(token));
  return new Response(null, { status: 204, headers: { "Set-Cookie": expiredSessionCookie(request.url) } });
}
