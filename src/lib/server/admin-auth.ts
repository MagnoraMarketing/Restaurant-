// Admin-session (cookie) + API-nøgle. Bruger Web Crypto, så samme kode virker i
// proxy.ts og i route handlers. I DEMO_MODE er admin åben for alle (offentlig demo).

export const ADMIN_COOKIE = "aibooking_admin";
const SESSION_HOURS = 12;

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string) {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  return `${exp}.${await hmac(secret, String(exp))}`;
}

export async function verifySessionToken(token: string | undefined, secret: string) {
  if (!token || !secret) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(secret, exp));
}

export const verifyApiKey = (header: string | null, key: string) => {
  if (!header || !key) return false;
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return safeEqual(token, key);
};

export { safeEqual };
