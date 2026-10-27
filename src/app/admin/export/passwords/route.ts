import type { Prisma } from "@prisma/client";
import { getCurrentAdmin, userScope } from "@/lib/auth";
import { roleLabel } from "@/lib/constants";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { decryptPassword } from "@/lib/passwords";

// Admin-only download of quiz-takers' current passwords, limited to the admin's own users.
export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Not signed in", { status: 401 });
  const f = Object.fromEntries(new URL(req.url).searchParams);
  const where: Prisma.UserWhereInput = {
    ...userScope(admin),
    ...(f.districtId ? { districtId: f.districtId } : {}),
    ...(f.blockId ? { blockId: f.blockId } : {}),
  };
  const users = await db.user.findMany({ where, include: { district: true, block: true, localAdmin: true }, orderBy: [{ district: { name: "asc" } }, { block: { name: "asc" } }, { name: "asc" }] });
  const body = users.map((u) => {
    let pw = "";
    try { pw = decryptPassword(u.passwordEncrypted); } catch { pw = "(reset needed)"; }
    return [u.district.name, u.block.name, roleLabel(u.roleType), u.phone, u.name, u.localAdmin?.username ?? "", pw, u.active ? "Active" : "Inactive"];
  });
  return csvResponse(`passwords-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(["district", "block", "role_type", "phone", "name", "local_admin", "password", "status"], body));
}
