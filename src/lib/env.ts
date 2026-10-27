// Reads required settings from environment variables and fails loudly if one is missing.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

export const env = {
  get sessionSecret() {
    const value = required("SESSION_SECRET");
    if (value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
    return value;
  },
  get passwordKey() {
    const key = Buffer.from(required("PASSWORD_ENCRYPTION_KEY"), "base64");
    if (key.length !== 32) throw new Error("PASSWORD_ENCRYPTION_KEY must be 32 bytes, base64 encoded.");
    return key;
  },
  get defaultUserPassword() {
    return required("DEFAULT_USER_PASSWORD");
  },
  isProduction: process.env.NODE_ENV === "production",
};
