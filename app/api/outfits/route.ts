import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWardrobeItems } from "@/lib/google-sheets";
import { getOutfitSuggestions, GeminiRateLimitError, GeminiModelNotFoundError } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;

  try {
    const { occasion, weather } = await request.json();

    const wardrobeItems = await getWardrobeItems(
      session.accessToken,
      spreadsheetId
    );

    if (wardrobeItems.length === 0) {
      return NextResponse.json(
        { error: "No wardrobe items found. Please add some clothes first!" },
        { status: 400 }
      );
    }

    const suggestions = await getOutfitSuggestions(wardrobeItems, occasion, weather);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error getting outfit suggestions:", error);
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof GeminiModelNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Failed to get outfit suggestions" },
      { status: 500 }
    );
  }
}
