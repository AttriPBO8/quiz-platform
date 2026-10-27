"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireSuperAdmin, userScope } from "@/lib/auth";
import { env } from "@/lib/env";
import { parseCsv } from "@/lib/csv";
import { importUsers, type ImportReport } from "@/lib/importers";
import { decryptPassword, generatePassword, protectPassword } from "@/lib/passwords";

// Admin actions on quiz-takers. Each one re-checks that the user belongs to the admin.

async function ownedUser(userId: string) {
  const admin = await requireAdmin();
  const user = await db.user.findFirst({ where: { id: userId, ...userScope(admin) } });
  if (!user) throw new Error("User not found.");
  return user;
}

export async function revealPassword(userId: string): Promise<string> {
  const user = await ownedUser(userId);
  try { return decryptPassword(user.passwordEncrypted); } catch { return "(cannot be shown: reset it)"; }
}

export async function resetPassword(userId: string, useDefault: boolean): Promise<string> {
  const user = await ownedUser(userId);
  const plain = useDefault ? env.defaultUserPassword : generatePassword(10);
  await db.user.update({
    where: { id: user.id },
    data: { ...(await protectPassword(plain)), passwordChangedAt: null, failedLogins: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
  });
  revalidatePath("/admin/users");
  return plain;
}

export async function setUserActive(userId: string, active: boolean) {
  const user = await ownedUser(userId);
  await db.user.update({ where: { id: user.id }, data: { active, sessionVersion: { increment: 1 } } });
  revalidatePath("/admin/users");
}

export async function uploadUsers(_: ImportReport | { error: string } | undefined, form: FormData): Promise<ImportReport | { error: string }> {
  await requireSuperAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > 5 * 1024 * 1024) return { error: "The file is larger than 5 MB. Split it into smaller files." };
  const rows = parseCsv(await file.text());
  if (!rows.length) return { error: "The file has no rows." };
  const missing = ["district", "block", "role_type", "phone", "name"].filter((c) => !(c in rows[0]));
  if (missing.length) return { error: `Missing column(s): ${missing.join(", ")}.` };
  const report = await importUsers(db, rows, env.defaultUserPassword);
  revalidatePath("/admin/users");
  return report;
}
