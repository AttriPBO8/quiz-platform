import { getCurrentAdmin } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";

// Blank questions spreadsheet with two example rows, for Admin > Question banks.
export async function GET() {
  if (!(await getCurrentAdmin())) return new Response("Not signed in", { status: 401 });
  return csvResponse("questions-template.csv", toCsv(
    ["id", "question", "option_1", "option_2", "option_3", "option_4", "option_5", "option_6", "correct_option", "difficulty", "category"],
    [
      ["q_001", "What is the capital of India?", "Mumbai", "New Delhi", "Kolkata", "Chennai", "", "", "2", "easy", "General Knowledge"],
      ["q_002", "Which of these is a prime number?", "21", "27", "29", "33", "", "", "C", "medium", "Mathematics"],
    ],
  ));
}
