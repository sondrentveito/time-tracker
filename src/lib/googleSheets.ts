import { google } from "googleapis";

/** Raw row from the spreadsheet, keyed by lowercase header names */
export type SheetRecord = Record<string, string>;

function getCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || "Timelogg";

  if (!clientEmail || !privateKey || !sheetId) {
    throw new Error("Missing Google credentials");
  }

  return { clientEmail, privateKey, sheetId, sheetName };
}

function getWriteAuth(clientEmail: string, privateKey: string) {
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getReadAuth(clientEmail: string, privateKey: string) {
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

// ─── Time Entry CRUD (columns A-I) ───
// A: Timestamp, B: Date, C: Start, D: End, E: Duration, F: Type, G: Location, H: Note, I: Auto

/** Fetch all time entry rows */
export async function fetchSheetRows(): Promise<SheetRecord[]> {
  const { clientEmail, privateKey, sheetId, sheetName } = getCredentials();
  const auth = getReadAuth(clientEmail, privateKey);
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:I`,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((h: string) => h.toLowerCase().trim());
  return rows.slice(1).map((row: string[]) => {
    const obj: SheetRecord = {};
    headers.forEach((header: string, i: number) => {
      obj[header] = row[i] ?? "";
    });
    return obj;
  });
}

/** Append a new time entry row */
export async function appendSheetRow(row: {
  date: string;
  start: string;
  end: string;
  duration: number;
  type: string;
  location: string;
  note: string;
  auto: boolean;
}): Promise<string> {
  const { clientEmail, privateKey, sheetId, sheetName } = getCredentials();
  const auth = getWriteAuth(clientEmail, privateKey);
  const sheets = google.sheets({ version: "v4", auth });

  const timestamp = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:I`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        timestamp,
        row.date,
        row.start,
        row.end,
        row.duration,
        row.type,
        row.location,
        row.note,
        row.auto ? "true" : "false",
      ]],
    },
  });

  return timestamp;
}

/** Update a time entry row by matching its timestamp (column A) */
export async function updateSheetRow(
  timestamp: string,
  updates: Partial<{
    date: string;
    start: string;
    end: string;
    duration: number;
    type: string;
    location: string;
    note: string;
    auto: boolean;
  }>
): Promise<boolean> {
  const { clientEmail, privateKey, sheetId, sheetName } = getCredentials();
  const auth = getWriteAuth(clientEmail, privateKey);
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:I`,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return false;

  const rowIndex = rows.findIndex((r) => r[0] === timestamp);
  if (rowIndex < 0) return false;

  const existing = rows[rowIndex];
  const updated = [
    existing[0], // timestamp (immutable)
    updates.date ?? existing[1],
    updates.start ?? existing[2],
    updates.end ?? existing[3],
    updates.duration !== undefined ? updates.duration : existing[4],
    updates.type ?? existing[5],
    updates.location ?? existing[6],
    updates.note ?? existing[7],
    updates.auto !== undefined ? (updates.auto ? "true" : "false") : existing[8],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!A${rowIndex + 1}:I${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [updated] },
  });

  return true;
}

/** Delete a time entry row by matching its timestamp */
export async function deleteSheetRow(timestamp: string): Promise<boolean> {
  const { clientEmail, privateKey, sheetId, sheetName } = getCredentials();
  const auth = getWriteAuth(clientEmail, privateKey);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) return false;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:A`,
  });

  const rows = response.data.values;
  if (!rows) return false;

  const rowIndex = rows.findIndex((r) => r[0] === timestamp);
  if (rowIndex < 0) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties!.sheetId!,
            dimension: "ROWS",
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });

  return true;
}

// ─── Config tab (key-value storage) ───

const CONFIG_TAB = "Config";

/** Read all config key-value pairs from the Config tab */
export async function readConfig(): Promise<Record<string, string>> {
  const { clientEmail, privateKey, sheetId } = getCredentials();
  const auth = getWriteAuth(clientEmail, privateKey);
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${CONFIG_TAB}!A:B`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return {};

    const config: Record<string, string> = {};
    for (const row of rows) {
      if (row[0]) config[row[0]] = row[1] ?? "";
    }
    return config;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unable to parse range")) return {};
    throw e;
  }
}

/** Read a single config value by key */
export async function readConfigKey(key: string): Promise<string | null> {
  const config = await readConfig();
  return config[key] ?? null;
}

/** Write a config key-value pair (upsert) */
export async function writeConfigKey(key: string, value: string): Promise<void> {
  const { clientEmail, privateKey, sheetId } = getCredentials();
  const auth = getWriteAuth(clientEmail, privateKey);
  const sheets = google.sheets({ version: "v4", auth });

  let existingRow = -1;
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${CONFIG_TAB}!A:A`,
    });
    const rows = response.data.values;
    if (rows) {
      existingRow = rows.findIndex((r) => r[0] === key);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("Unable to parse range")) throw e;
  }

  if (existingRow >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${CONFIG_TAB}!A${existingRow + 1}:B${existingRow + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[key, value]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${CONFIG_TAB}!A:B`,
      valueInputOption: "RAW",
      requestBody: { values: [[key, value]] },
    });
  }
}
