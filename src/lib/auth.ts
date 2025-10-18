import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function b64url(buf: Buffer | string) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 120000, 64, "sha512").toString("hex");
  return { salt: s, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = hashPassword(password, salt);
  // timing-safe compare
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

export function signJWT(payload: Record<string, unknown>, expiresInSec = 7 * 24 * 3600) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + expiresInSec };
  const part1 = b64url(JSON.stringify(header));
  const part2 = b64url(JSON.stringify(full));
  const data = `${part1}.${part2}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sig}`;
}

export function verifyJWT(token: string) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (sig !== s) return null;
  const payload = JSON.parse(Buffer.from(p, "base64").toString());
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload as Record<string, unknown>;
}
