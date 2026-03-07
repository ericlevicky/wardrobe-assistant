import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteWardrobeItem } from "@/lib/google-sheets";
import { deleteImageFromDrive } from "@/lib/google-drive";
import { getWardrobeItems } from "@/lib/google-sheets";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
  const { id } = await params;

  try {
    // Get item to find drive file id before deleting
    const items = await getWardrobeItems(session.accessToken, spreadsheetId);
    const item = items.find((i) => i.id === id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Delete from Drive if there's an associated file
    if (item.driveFileId) {
      try {
        await deleteImageFromDrive(session.accessToken, item.driveFileId);
      } catch (driveError) {
        console.error("Failed to delete Drive file:", driveError);
        // Continue with sheet deletion even if drive deletion fails
      }
    }

    await deleteWardrobeItem(session.accessToken, spreadsheetId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting wardrobe item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
