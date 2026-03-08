import { google } from "googleapis";

export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string;
  imageUrl: string;
  driveFileId: string;
  tags: string;
  addedAt: string;
}

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing required environment variables: GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be set"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function ensureUserSheetExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetTitle: string
) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = spreadsheet.data.sheets?.map(
    (s) => s.properties?.title
  ) ?? [];

  if (!sheetNames.includes(sheetTitle)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetTitle },
            },
          },
        ],
      },
    });

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["id", "name", "category", "color", "imageUrl", "driveFileId", "tags", "addedAt"]],
      },
    });
  }
}

/**
 * Converts a user ID into a safe Google Sheets tab title.
 * Google Sheets tab names are limited to 100 characters and may not contain
 * the characters: \ / ? * [ ]
 */
function userSheetTitle(userId: string): string {
  const sanitized = userId.replace(/[\\/?*[\]]/g, "_").trim();
  if (!sanitized) {
    throw new Error("Invalid userId: cannot derive a sheet title from an empty or blank user ID");
  }
  // Prefix avoids collisions with default system sheets (e.g. "Sheet1")
  return `User_${sanitized}`.slice(0, 100);
}

/**
 * Converts a legacy Google Drive export URL to the direct lh3.googleusercontent.com
 * format which renders correctly in browsers.
 * e.g. https://drive.google.com/uc?export=view&id=FILE_ID
 *   -> https://lh3.googleusercontent.com/d/FILE_ID
 */
function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "drive.google.com" &&
      parsed.pathname === "/uc" &&
      parsed.searchParams.get("export") === "view"
    ) {
      const fileId = parsed.searchParams.get("id");
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }
  } catch {
    // Not a valid URL; return as-is
  }
  return url;
}

export async function getWardrobeItems(
  spreadsheetId: string,
  userId: string
): Promise<ClothingItem[]> {
  const sheets = getSheetsClient();
  const sheetTitle = userSheetTitle(userId);
  await ensureUserSheetExists(sheets, spreadsheetId, sheetTitle);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A2:H`,
  });

  const rows = response.data.values ?? [];
  return rows.map((row) => ({
    id: row[0] ?? "",
    name: row[1] ?? "",
    category: row[2] ?? "",
    color: row[3] ?? "",
    imageUrl: normalizeImageUrl(row[4] ?? ""),
    driveFileId: row[5] ?? "",
    tags: row[6] ?? "",
    addedAt: row[7] ?? "",
  }));
}

export async function addWardrobeItem(
  spreadsheetId: string,
  userId: string,
  item: Omit<ClothingItem, "id" | "addedAt">
): Promise<ClothingItem> {
  const sheets = getSheetsClient();
  const sheetTitle = userSheetTitle(userId);
  await ensureUserSheetExists(sheets, spreadsheetId, sheetTitle);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const addedAt = new Date().toISOString();
  const newItem: ClothingItem = { ...item, id, addedAt };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTitle}!A:H`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[id, item.name, item.category, item.color, item.imageUrl, item.driveFileId, item.tags, addedAt]],
    },
  });

  return newItem;
}

export async function deleteWardrobeItem(
  spreadsheetId: string,
  userId: string,
  itemId: string
): Promise<void> {
  const sheets = getSheetsClient();
  const sheetTitle = userSheetTitle(userId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A:A`,
  });

  const rows = response.data.values ?? [];
  const rowIndex = rows.findIndex((row) => row[0] === itemId);

  if (rowIndex === -1) return;

  // Get the sheet ID for the user's tab
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const userSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetTitle
  );
  if (!userSheet || userSheet.properties?.sheetId == null) {
    throw new Error(`Sheet tab "${sheetTitle}" not found; cannot delete row`);
  }
  const sheetId = userSheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}
