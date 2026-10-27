// Creates a .env file with fresh random secrets: run `npm run setup` once on a new machine.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { generatePassword } from "../src/lib/passwords";

if (existsSync(".env") && readFileSync(".env", "utf8").includes("SESSION_SECRET")) {
  console.log(".env already exists; nothing changed.");
  process.exit(0);
}
const dbPassword = process.argv[2] ?? "postgres";
const lines = [
  "# Local settings. Never commit this file. See .env.example for what each one means.",
  `DATABASE_URL="postgresql://postgres:${dbPassword}@localhost:5432/quizportal"`,
  `SESSION_SECRET="${randomBytes(48).toString("base64url")}"`,
  `PASSWORD_ENCRYPTION_KEY="${randomBytes(32).toString("base64")}"`,
  `DEFAULT_USER_PASSWORD="${generatePassword(10)}"`,
  `SEED_ADMIN_PASSWORD="${generatePassword(14)}"`,
];
writeFileSync(".env", lines.join("\n") + "\n");
console.log("Created .env. Test passwords:");
console.log(lines.slice(4).join("\n"));
