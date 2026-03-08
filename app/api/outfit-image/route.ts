import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateOutfitImage,
  GeminiRateLimitError,
  GeminiModelNotFoundError,
} from "@/lib/gemini";

async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string } | null> {
  // Only fetch from trusted Google Drive domains
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const allowedHosts = ["drive.google.com", "lh3.googleusercontent.com"];
  if (!allowedHosts.includes(parsed.hostname)) {
    return null;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    const buffer = Buffer.from(await res.arrayBuffer());
    return { base64: buffer.toString("base64"), mimeType };
  } catch (err) {
    console.error("Failed to fetch clothing image:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { outfitItems, clothingImageUrls } = await request.json();

    if (!outfitItems || outfitItems.length === 0) {
      return NextResponse.json(
        { error: "No outfit items provided" },
        { status: 400 }
      );
    }

    // Fetch clothing images from Drive URLs (they are publicly readable)
    const clothingImages: Array<{ base64: string; mimeType: string }> = [];
    if (clothingImageUrls && clothingImageUrls.length > 0) {
      const fetched = await Promise.all(
        (clothingImageUrls as string[])
          .slice(0, 4)
          .map((url) => fetchImageAsBase64(url))
      );
      for (const img of fetched) {
        if (img) clothingImages.push(img);
      }
    }

    const result = await generateOutfitImage(outfitItems, clothingImages);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Outfit image generation error:", error);
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof GeminiModelNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Failed to generate outfit image" },
      { status: 500 }
    );
  }
}
