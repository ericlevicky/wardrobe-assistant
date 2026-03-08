import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWardrobeItems, addWardrobeItem } from "@/lib/google-sheets";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;

  try {
    const items = await getWardrobeItems(spreadsheetId, session.userId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching wardrobe:", error);
    return NextResponse.json({ error: "Failed to fetch wardrobe" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;

  try {
    const body = await request.json();
    const item = await addWardrobeItem(spreadsheetId, session.userId, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding wardrobe item:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
