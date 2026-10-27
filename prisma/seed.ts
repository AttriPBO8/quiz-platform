// Loads sample data for development and testing: run `npm run db:seed`.
// Safe to run more than once; existing rows are updated, not duplicated.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { parseCsv } from "../src/lib/csv";
import { importQuestions, importUsers } from "../src/lib/importers";
import { hashPassword } from "../src/lib/passwords";

const db = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const userPassword = process.env.DEFAULT_USER_PASSWORD;
  if (!adminPassword || !userPassword) throw new Error("Run `npm run setup` first to create .env.");
  const passwordHash = await hashPassword(adminPassword);

  await db.admin.upsert({
    where: { username: "superadmin" },
    update: {},
    create: { username: "superadmin", name: "Super Admin", role: "SUPER_ADMIN", passwordHash },
  });
  for (let d = 1; d <= 5; d++) {
    await db.admin.upsert({
      where: { username: `localadmin${d}` },
      update: {},
      create: { username: `localadmin${d}`, name: `Local Admin ${d}`, role: "LOCAL_ADMIN", passwordHash },
    });
  }

  const users = await importUsers(db, parseCsv(readFileSync("data/sample-users.csv", "utf8")), userPassword);
  console.log("Users:", users.created, "created,", users.updated, "updated,", users.errors.length, "errors");

  const questions = await importQuestions(db, "General Knowledge", JSON.parse(readFileSync("data/sample-questions.json", "utf8")));
  console.log("Questions:", questions.created, "created,", questions.updated, "updated,", questions.errors.length, "errors");

  const bank = await db.questionBank.findUniqueOrThrow({ where: { name: "General Knowledge" } });
  let quiz = await db.quiz.findFirst({ where: { title: "Topic A - Sample Text" } });
  if (!quiz) quiz = await db.quiz.create({ data: { title: "Topic A - Sample Text", bankId: bank.id } });

  const localAdmins = await db.admin.findMany({ where: { role: "LOCAL_ADMIN" } });
  await db.quizManager.createMany({ data: localAdmins.map((a) => ({ quizId: quiz.id, adminId: a.id })), skipDuplicates: true });
  const allUsers = await db.user.findMany({ select: { id: true } });
  await db.assignment.createMany({ data: allUsers.map((u) => ({ quizId: quiz.id, userId: u.id })), skipDuplicates: true });
  console.log(`Quiz "${quiz.title}" assigned to ${allUsers.length} users.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
