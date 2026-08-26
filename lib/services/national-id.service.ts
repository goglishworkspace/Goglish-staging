import "server-only";
import crypto from "node:crypto";

export {
  extractBirthDateFromNationalId,
  calculateAge,
  validateNationalId,
  nationalIdErrorMessage,
  type NationalIdValidation,
} from "@/lib/national-id";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const hex = process.env.NATIONAL_ID_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "NATIONAL_ID_ENCRYPTION_KEY must be a 64-character hex string (32 bytes) for AES-256",
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypts a national ID with AES-256-GCM. Output: base64(iv | authTag | ciphertext). */
export function encryptNationalId(plain: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Decrypts a value produced by encryptNationalId. Server-only, never exposed via API. */
export function decryptNationalId(encoded: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buf.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function maskNationalId(nationalId: string): string {
  return `${nationalId.slice(0, 4)}****${nationalId.slice(-4)}`;
}
