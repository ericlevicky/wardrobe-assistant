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

async function ensureSheetExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = spreadsheet.data.sheets?.map(
    (s) => s.properties?.title
  ) ?? [];

  if (!sheetNames.includes("Wardrobe")) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: "Wardrobe" },
            },
          },
        ],
      },
    });

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Wardrobe!A1:H1",
      valueInputOption: "RAW",
      requestBody: {
        values: [["id", "name", "category", "color", "imageUrl", "driveFileId", "tags", "addedAt"]],
      },
    });
  }
}

export async function getWardrobeItems(
  spreadsheetId: string
): Promise<ClothingItem[]> {
  const sheets = getSheetsClient();
  await ensureSheetExists(sheets, spreadsheetId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Wardrobe!A2:H",
  });

  const rows = response.data.values ?? [];
  return rows.map((row) => ({
    id: row[0] ?? "",
    name: row[1] ?? "",
    category: row[2] ?? "",
    color: row[3] ?? "",
    imageUrl: row[4] ?? "",
    driveFileId: row[5] ?? "",
    tags: row[6] ?? "",
    addedAt: row[7] ?? "",
  }));
}

export async function addWardrobeItem(
  spreadsheetId: string,
  item: Omit<ClothingItem, "id" | "addedAt">
): Promise<ClothingItem> {
  const sheets = getSheetsClient();
  await ensureSheetExists(sheets, spreadsheetId);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const addedAt = new Date().toISOString();
  const newItem: ClothingItem = { ...item, id, addedAt };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Wardrobe!A:H",
    valueInputOption: "RAW",
    requestBody: {
      values: [[id, item.name, item.category, item.color, item.imageUrl, item.driveFileId, item.tags, addedAt]],
    },
  });

  return newItem;
}

export async function deleteWardrobeItem(
  spreadsheetId: string,
  itemId: string
): Promise<void> {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Wardrobe!A:A",
  });

  const rows = response.data.values ?? [];
  const rowIndex = rows.findIndex((row) => row[0] === itemId);

  if (rowIndex === -1) return;

  // Get the sheet ID for the Wardrobe sheet
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const wardrobeSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "Wardrobe"
  );
  const sheetId = wardrobeSheet?.properties?.sheetId ?? 0;

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
