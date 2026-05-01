import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM encrypt/decrypt for sensitive worker payout details.
 * Key must be a 64-char hex string (32 bytes) in PAYOUT_ENCRYPTION_KEY env var.
 */
export function encryptPayoutDetails(plaintext: string): string {
  const keyHex = process.env.PAYOUT_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("PAYOUT_ENCRYPTION_KEY not configured (must be exactly 64-char hex / 32 bytes)");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) throw new Error("PAYOUT_ENCRYPTION_KEY decoded to wrong length");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptPayoutDetails(ciphertext: string): string {
  const keyHex = process.env.PAYOUT_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) throw new Error("PAYOUT_ENCRYPTION_KEY not configured");
  const parts = ciphertext.split(".");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, tagHex, encHex] = parts;
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
