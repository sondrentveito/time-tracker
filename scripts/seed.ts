import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env"), quiet: true });

import { appendSheetRow } from "../src/lib/googleSheets";

const types = ["work"] as const;
const locations = ["office", "home"] as const;
const notes = [
  "Jobbet med frontend",
  "Standup og sprint planning",
  "Kodegjennomgang",
  "Jobbet med API-integrasjon",
  "Dokumentasjon",
  "Testing og bugfiks",
  "Designmøte",
  "Parprogrammering",
  "Refaktorering",
  "Deploy til prod",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatSheetDate(date: Date) {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

async function seed() {
  const rows = [];

  // Generate entries for the last 10 workdays
  const today = new Date();
  let daysBack = 0;
  let workdays = 0;

  while (workdays < 10) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysBack);
    const dow = d.getDay();
    daysBack++;

    if (dow === 0 || dow === 6) continue; // skip weekends
    workdays++;

    const dateStr = formatSheetDate(d);

    // One entry per day: full workday, with lunch already deducted from duration.
    const startH = 8;
    const duration = Math.random() > 0.5 ? 7 : 7.5;
    const end = duration === 7 ? "15:30" : "16:00";

    rows.push({
      date: dateStr,
      start: `${pad(startH)}:00`,
      end,
      duration,
      type: randomItem(types),
      location: randomItem(locations),
      note: randomItem(notes),
      auto: false,
    });
  }

  console.log(`Seeding ${rows.length} rows...`);

  for (const row of rows) {
    await appendSheetRow(row);
    console.log(`  Added: ${row.date} ${row.start}-${row.end} (${row.type})`);
  }

  console.log("Done!");
}

seed().catch(console.error);
