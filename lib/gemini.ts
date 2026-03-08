import { GoogleGenAI, Modality, Part, ApiError } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL_NAME = "gemini-2.5-flash";
const IMAGE_GEN_MODEL = "gemini-2.0-flash-exp";

export class GeminiRateLimitError extends Error {
  constructor(
    message = "Gemini API rate limit reached. You may have hit the per-minute request limit—please wait a moment and try again. If this issue persists, check your usage and billing at https://aistudio.google.com or visit https://ai.dev/rate-limit to review your limits."
  ) {
    super(message);
    this.name = "GeminiRateLimitError";
  }
}

export class GeminiModelNotFoundError extends Error {
  constructor(modelName: string = MODEL_NAME) {
    super(
      `Gemini model not found. Verify that your API key has access to the '${modelName}' model at https://aistudio.google.com/app/apikey.`
    );
    this.name = "GeminiModelNotFoundError";
  }
}

function handleGeminiError(error: unknown, modelName: string = MODEL_NAME): never {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      throw new GeminiRateLimitError();
    }
    if (error.status === 404) {
      throw new GeminiModelNotFoundError(modelName);
    }
  }
  if (error instanceof Error) {
    if (
      error.message.includes("429") ||
      error.message.includes("Too Many Requests") ||
      error.message.includes("RESOURCE_EXHAUSTED") ||
      error.message.toLowerCase().includes("quota")
    ) {
      throw new GeminiRateLimitError();
    }
    if (
      error.message.includes("404") ||
      error.message.includes("NOT_FOUND")
    ) {
      throw new GeminiModelNotFoundError(modelName);
    }
  }
  throw error;
}

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

  const response = await genAI.models.generateContent({
    model: MODEL_NAME,
    contents: [prompt, imagePart],
  }).catch((e) => handleGeminiError(e, MODEL_NAME));

  const text = response.text;
  if (!text) {
    throw new Error("Failed to get AI response");
  }

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

  const response = await genAI.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  }).catch((e) => handleGeminiError(e, MODEL_NAME));

  const text = response.text;
  if (!text) {
    throw new Error("Failed to get AI response");
  }

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

  const response = await genAI.models.generateContent({
    model: MODEL_NAME,
    contents: parts,
  }).catch((e) => handleGeminiError(e, MODEL_NAME));

  const text = response.text;
  if (!text) {
    throw new Error("Failed to get AI response");
  }
  return text;
}

export interface GeneratedImageResult {
  imageData: string;
  mimeType: string;
}

export async function generateOutfitImage(
  outfitItems: Array<{ name: string; color: string; category: string }>,
  clothingImages?: Array<{ base64: string; mimeType: string }>,
  personImage?: { base64: string; mimeType: string }
): Promise<GeneratedImageResult> {
  const parts: Part[] = [];

  if (personImage) {
    parts.push({
      inlineData: {
        data: personImage.base64,
        mimeType: personImage.mimeType,
      },
    });
  }

  if (clothingImages && clothingImages.length > 0) {
    for (const img of clothingImages.slice(0, 4)) {
      parts.push({
        inlineData: {
          data: img.base64,
          mimeType: img.mimeType,
        },
      });
    }
  }

  const outfitDescription = outfitItems
    .map((item) => `${item.name} (${item.color} ${item.category})`)
    .join(", ");

  const prompt = personImage
    ? `Generate a photorealistic image showing this person wearing the following outfit: ${outfitDescription}. Keep the person's appearance exactly the same. Show them wearing all the clothing items in a natural, flattering pose with good lighting.`
    : `Create a stylish fashion flat lay image showcasing these clothing items arranged together as a complete outfit: ${outfitDescription}. Arrange them aesthetically on a clean, light background as if displayed in a fashion magazine.`;

  parts.push({ text: prompt });

  const response = await genAI.models
    .generateContent({
      model: IMAGE_GEN_MODEL,
      contents: parts,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    })
    .catch((e) => handleGeminiError(e, IMAGE_GEN_MODEL));

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No image generated");
  }

  const responseParts = candidates[0].content?.parts;
  if (!responseParts) {
    throw new Error("No image found in response");
  }

  for (const part of responseParts) {
    if (part.inlineData?.data) {
      return {
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("No image found in response");
}
