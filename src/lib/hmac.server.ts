import { createHmac, timingSafeEqual } from "crypto";

/**
 * HMAC-SHA256 signing utility for signed links (unsubscribe, data access).
 * Server-only. Never import from client code.
 */

function getSecret(): string {
  const s = process.env.HOTELVALEUR_HMAC_SECRET;
  if (!s) throw new Error("HOTELVALEUR_HMAC_SECRET is not configured.");
  return s;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export interface SignedTokenPayload {
  purpose: string;
  subject: string; // e.g. email
  exp: number; // epoch seconds
}

export function signToken(payload: SignedTokenPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(
  token: string,
  expectedPurpose: string,
): SignedTokenPayload | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = createHmac("sha256", getSecret()).update(body).digest();
    const given = b64urlDecode(sig);
    if (expected.length !== given.length) return null;
    if (!timingSafeEqual(expected, given)) return null;
    const payload = JSON.parse(b64urlDecode(body).toString()) as SignedTokenPayload;
    if (payload.purpose !== expectedPurpose) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
