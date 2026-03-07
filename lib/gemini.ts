import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ClothingAnalysis {
  name: string;
  category: string;
  color: string;
  tags: string;
  description: string;
}

export async function analyzeClothingImage(
  imageBase64: string,
  mimeType: string
): Promise<ClothingAnalysis> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imagePart: Part = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const prompt = `Analyze this clothing item and provide:
1. A short descriptive name (e.g., "Blue Denim Jacket", "Floral Summer Dress")
2. Category (one of: Tops, Bottoms, Dresses, Outerwear, Footwear, Accessories, Other)
3. Primary color
4. Tags (comma-separated keywords like: casual, formal, summer, winter, etc.)
5. Brief description

Respond ONLY in this exact JSON format:
{
  "name": "...",
  "category": "...",
  "color": "...",
  "tags": "...",
  "description": "..."
}`;

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response");
  }

  return JSON.parse(jsonMatch[0]) as ClothingAnalysis;
}

export interface OutfitSuggestion {
  title: string;
  items: string[];
  occasion: string;
  description: string;
  stylingTips: string;
}

export async function getOutfitSuggestions(
  wardrobeItems: Array<{ name: string; category: string; color: string; tags: string }>,
  occasion?: string,
  weather?: string
): Promise<OutfitSuggestion[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const wardrobeDescription = wardrobeItems
    .map((item) => `- ${item.name} (${item.category}, ${item.color}, tags: ${item.tags})`)
    .join("\n");

  const prompt = `You are a personal fashion stylist. Based on this wardrobe:
${wardrobeDescription}

${occasion ? `Occasion: ${occasion}` : ""}
${weather ? `Weather/Season: ${weather}` : ""}

Suggest 3 complete outfit combinations. For each outfit:
- Use only items from the wardrobe list above
- Consider color coordination and style matching
- Provide styling tips

Respond ONLY in this exact JSON format:
[
  {
    "title": "Outfit name",
    "items": ["item name 1", "item name 2"],
    "occasion": "when to wear",
    "description": "why this works",
    "stylingTips": "how to style it"
  }
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI outfit suggestions");
  }

  return JSON.parse(jsonMatch[0]) as OutfitSuggestion[];
}

export async function virtualTryOn(
  personImageBase64: string,
  personMimeType: string,
  outfitItems: Array<{ name: string; color: string; category: string }>,
  clothingImages?: Array<{ base64: string; mimeType: string }>
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const parts: Part[] = [];

  const outfitDescription = outfitItems
    .map((item) => `${item.name} (${item.color} ${item.category})`)
    .join(", ");

  parts.push({
    inlineData: {
      data: personImageBase64,
      mimeType: personMimeType,
    },
  });

  if (clothingImages && clothingImages.length > 0) {
    for (const img of clothingImages.slice(0, 3)) {
      parts.push({
        inlineData: {
          data: img.base64,
          mimeType: img.mimeType,
        },
      });
    }
  }

  const prompt = `You are a virtual fashion stylist. I'm showing you a photo of a person and clothing items.

The outfit to try on consists of: ${outfitDescription}

Please provide a detailed, vivid description of how this outfit would look on this person:
1. How each clothing item complements their body type and features
2. Color harmony with their skin tone and hair
3. Overall silhouette and proportions
4. Specific styling suggestions to make the outfit work best for them
5. Accessories or adjustments that would enhance the look

Be encouraging, specific, and helpful. Format your response with clear sections.`;

  parts.push({ text: prompt });

  const result = await model.generateContent(parts);
  return result.response.text();
}
