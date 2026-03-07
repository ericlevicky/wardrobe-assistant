import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { virtualTryOn } from "@/lib/gemini";

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

    const result = await virtualTryOn(
      personBase64,
      personImage.type,
      outfitItems,
      clothingImageUrls
    );

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Virtual try-on error:", error);
    return NextResponse.json({ error: "Try-on failed" }, { status: 500 });
  }
}
