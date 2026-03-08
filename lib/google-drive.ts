import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

export async function uploadImageToDrive(
  accessToken: string,
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient(accessToken);

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
  accessToken: string,
  fileId: string
): Promise<void> {
  const drive = getDriveClient(accessToken);
  await drive.files.delete({ fileId });
}
