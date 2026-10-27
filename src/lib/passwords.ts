import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "./env";

// Passwords are stored twice:
//  - a bcrypt hash, used to check logins (cannot be reversed);
//  - an AES-256-GCM encrypted copy, so admins can view a quiz-taker's password.
// The encryption key lives only in the PASSWORD_ENCRYPTION_KEY environment variable.

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function encryptPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", env.passwordKey, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decryptPassword(stored: string): string {
  const [iv, tag, data] = stored.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", env.passwordKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Returns an error message, or null when the password is acceptable. */
export function checkPasswordStrength(plain: string): string | null {
  if (plain.length < 8) return "Use at least 8 characters.";
  if (plain.length > 64) return "Use at most 64 characters.";
  if (!/[A-Za-z]/.test(plain) || !/[0-9]/.test(plain)) return "Use both letters and numbers.";
  return null;
}

/** A random alphanumeric password with at least one letter and one digit (no look-alike characters). */
export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  for (;;) {
    const pw = Array.from(randomBytes(length), (b) => chars[b % chars.length]).join("");
    if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) return pw;
  }
}

export async function protectPassword(plain: string) {
  return { passwordHash: await hashPassword(plain), passwordEncrypted: encryptPassword(plain) };
}
