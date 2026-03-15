import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
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
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

export async function uploadImageToDrive(
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient();

  const stream = new Readable();
  stream.push(imageBuffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id,webViewLink,webContentLink",
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error("Google Drive did not return a file ID after upload");
  }

  // Make the file publicly viewable
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // Get the direct image URL
  const file = await drive.files.get({
    fileId,
    fields: "id,webViewLink,webContentLink",
  });

  return {
    fileId,
    webViewLink: `https://lh3.googleusercontent.com/d/${fileId}`,
  };
}

export async function deleteImageFromDrive(
  fileId: string
): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}
