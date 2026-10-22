import crypto from "node:crypto";

/** WALayer webhook HMAC verification — raw body + timestamp window. */
export function verifyWalayerWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  secret: string;
  maxSkewSec?: number;
}): boolean {
  const { rawBody, signatureHeader, timestampHeader, secret } = params;
  const maxSkew = params.maxSkewSec ?? 300;
  if (!signatureHeader || !timestampHeader) return false;
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > maxSkew) return false;

  const expected =
    "v1,sha256=" +
    crypto.createHmac("sha256", secret).update(`${timestampHeader}.${rawBody}`).digest("hex");

  try {
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
