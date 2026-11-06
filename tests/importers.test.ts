import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/lib/csv";
import { questionsFromCsv } from "../src/lib/importers";

test("questions CSV from a spreadsheet becomes the JSON question shape", () => {
  const csv = "﻿id,question,option_1,option_2,option_3,option_4,option_5,option_6,correct_option,difficulty,category\r\n"
    + 'q_1,"Capital of India, the country?",Mumbai,New Delhi,Kolkata,Chennai,,,2,Easy,GK\r\n'
    + "q_2,Prime?,21,29,,,,,b,medium,\r\n";
  assert.deepEqual(questionsFromCsv(parseCsv(csv)), [
    { id: "q_1", text: "Capital of India, the country?", options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"], correctOption: 2, difficulty: "Easy", category: "GK" },
    { id: "q_2", text: "Prime?", options: ["21", "29"], correctOption: 2, difficulty: "medium", category: undefined },
  ]);
});
