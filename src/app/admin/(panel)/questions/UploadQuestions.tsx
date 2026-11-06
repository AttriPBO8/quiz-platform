"use client";

import { useActionState } from "react";
import { uploadQuestions } from "@/app/actions/admin-content";
import { ImportResult } from "@/components/ImportResult";

export function UploadQuestions({ banks }: { banks: string[] }) {
  const [state, action, pending] = useActionState(uploadQuestions, undefined);
  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-semibold">Upload questions from a spreadsheet (CSV) or JSON file</summary>
      <p className="mt-2 text-sm text-muted">
        <strong>Spreadsheet:</strong> start from the <a className="underline" href="/admin/export/questions-template">questions template</a>, fill in one question per row,
        then in Excel choose <em>File &gt; Save As &gt; CSV UTF-8</em>. <code>correct_option</code> is 1 to 6 or A to F; <code>difficulty</code> is easy, medium or hard.
      </p>
      <p className="mt-2 text-sm text-muted">
        <strong>JSON:</strong> a list of <code>{`{ "id": "q_001", "text": "…", "options": ["A","B","C","D"], "correctOption": 2, "difficulty": "easy", "category": "Science" }`}</code>.
        <code> correctOption</code> counts from 1 (1 = first option). Questions with an existing id in the bank are updated.
      </p>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label><span className="label">Question bank (new or existing)</span>
          <input className="input" name="bankName" list="bank-names" placeholder="e.g. Science" required />
          <datalist id="bank-names">{banks.map((b) => <option key={b} value={b} />)}</datalist>
        </label>
        <input type="file" name="file" accept=".csv,text/csv,.json,application/json" className="text-sm" required />
        <button className="btn btn-primary" disabled={pending}>{pending ? "Uploading…" : "Upload"}</button>
      </form>
      <div className="mt-3"><ImportResult state={state} /></div>
    </details>
  );
}
