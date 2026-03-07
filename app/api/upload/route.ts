import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImageToDrive } from "@/lib/google-drive";
import { analyzeClothingImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type;

    // Upload to Google Drive
    const { fileId, webViewLink } = await uploadImageToDrive(
      session.accessToken,
      buffer,
      `wardrobe-${Date.now()}-${file.name}`,
      mimeType
    );

    // Analyze with Gemini AI
    const analysis = await analyzeClothingImage(base64, mimeType);

    return NextResponse.json({
      fileId,
      imageUrl: webViewLink,
      analysis,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
