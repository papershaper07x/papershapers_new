import { cookies } from "next/headers";
import { findUserBySession } from "../db/service";

export const SESSION_COOKIE = "ps_session";
const PASSWORD_ITERATIONS = 210_000;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const pairs = hex.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((pair) => Number.parseInt(pair, 16)));
}

export function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToHex(bytes);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password: string, salt = randomToken(16)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return { salt, hash: bytesToHex(new Uint8Array(result)) };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  if (hash.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let index = 0; index < hash.length; index += 1) mismatch |= hash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  return mismatch === 0;
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findUserBySession(await sha256(token));
}

export function sessionCookie(token: string, requestUrl: string, expires: Date) {
  const host = new URL(requestUrl).hostname;
  const domain = host === "papershapers.in" || host.endsWith(".papershapers.in") ? "; Domain=.papershapers.in" : "";
  const secure = host === "localhost" || host === "127.0.0.1" ? "" : "; Secure";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${domain}${secure}`;
}

export function expiredSessionCookie(requestUrl: string) {
  return sessionCookie("", requestUrl, new Date(0));
}

export function readSessionToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`));
  return match?.[1] ?? null;
}

export async function userFromRequest(request: Request) {
  const token = readSessionToken(request);
  return token ? findUserBySession(await sha256(token)) : null;
}
