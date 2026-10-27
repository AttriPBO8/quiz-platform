import { getCurrentAdmin } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { getResultRows } from "@/lib/reports";

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Not signed in", { status: 401 });
  const f = Object.fromEntries(new URL(req.url).searchParams);
  const rows = await getResultRows(admin, f);
  const header = ["District", "Block", "Role", "Name", "Phone", "Local Admin", "Quiz", "Status", "Best score", "Attempts", "Last attempt", "Due by", "Passed on"];
  const body = rows.map((r) => [r.district, r.block, r.role, r.name, r.phone, r.localAdmin, r.quiz, r.statusLabel, r.best, r.attempts, r.lastAttempt, r.dueBy, r.completedOn]);
  return csvResponse(`results-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, body));
}
