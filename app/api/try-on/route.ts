import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  virtualTryOn,
  generateOutfitImage,
  GeminiRateLimitError,
  GeminiModelNotFoundError,
} from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const personImage = formData.get("personImage") as File;
    const outfitItemsJson = formData.get("outfitItems") as string;
    const clothingImagesJson = formData.get("clothingImages") as string;

    if (!personImage) {
      return NextResponse.json(
        { error: "No person image provided" },
        { status: 400 }
      );
    }

    const outfitItems = JSON.parse(outfitItemsJson || "[]");
    const clothingImageUrls = JSON.parse(clothingImagesJson || "[]");

    const personBuffer = Buffer.from(await personImage.arrayBuffer());
    const personBase64 = personBuffer.toString("base64");

    // Generate text description and outfit image in parallel
    const [result, generatedImage] = await Promise.allSettled([
      virtualTryOn(personBase64, personImage.type, outfitItems, clothingImageUrls),
      generateOutfitImage(
        outfitItems,
        undefined,
        { base64: personBase64, mimeType: personImage.type }
      ),
    ]);

    return NextResponse.json({
      result: result.status === "fulfilled" ? result.value : null,
      imageData:
        generatedImage.status === "fulfilled"
          ? generatedImage.value.imageData
          : null,
      imageMimeType:
        generatedImage.status === "fulfilled"
          ? generatedImage.value.mimeType
          : null,
    });
  } catch (error) {
    console.error("Virtual try-on error:", error);
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof GeminiModelNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Try-on failed" }, { status: 500 });
  }
}
