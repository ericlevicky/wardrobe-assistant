"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/Navigation";
import { OutfitSuggestion } from "@/lib/gemini";
import { ClothingItem } from "@/lib/google-sheets";

const OCCASIONS = ["Casual", "Work/Office", "Date Night", "Party", "Gym/Workout", "Outdoor", "Formal"];
const WEATHER = ["Spring", "Summer", "Fall", "Winter", "Rainy", "Hot & Sunny", "Cold"];

const CATEGORY_EMOJI: Record<string, string> = {
  Tops: "👕",
  Bottoms: "👖",
  Dresses: "👗",
  Outerwear: "🧥",
  Footwear: "👟",
  Accessories: "👜",
  Other: "🎽",
};

const RANDOM_INCLUDE_CHANCE = 0.5;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildShuffledOutfit(items: ClothingItem[]): ClothingItem[] {
  const byCategory = (cat: string) => items.filter((i) => i.category === cat);

  const tops = byCategory("Tops");
  const bottoms = byCategory("Bottoms");
  const dresses = byCategory("Dresses");
  const outerwear = byCategory("Outerwear");
  const footwear = byCategory("Footwear");
  const accessories = byCategory("Accessories");

  const outfit: ClothingItem[] = [];

  // Core: dress OR top + bottom
  const canUseDress = dresses.length > 0;
  const canUseTopBottom = tops.length > 0 || bottoms.length > 0;

  if (canUseDress && (!canUseTopBottom || Math.random() > RANDOM_INCLUDE_CHANCE)) {
    outfit.push(pickRandom(dresses));
  } else {
    if (tops.length > 0) outfit.push(pickRandom(tops));
    if (bottoms.length > 0) outfit.push(pickRandom(bottoms));
  }

  // Optional outerwear (50% chance if available)
  if (outerwear.length > 0 && Math.random() > RANDOM_INCLUDE_CHANCE) {
    outfit.push(pickRandom(outerwear));
  }

  // Footwear
  if (footwear.length > 0) {
    outfit.push(pickRandom(footwear));
  }

  // Accessories (50% chance, one item)
  if (accessories.length > 0 && Math.random() > RANDOM_INCLUDE_CHANCE) {
    outfit.push(pickRandom(accessories));
  }

  return outfit;
}

/** Match AI suggestion item names to actual wardrobe items (case-insensitive, partial). */
function matchItems(names: string[], wardrobe: ClothingItem[]): ClothingItem[] {
  return names.flatMap((name) => {
    const lower = name.toLowerCase();
    const match = wardrobe.find(
      (item) =>
        item.name.toLowerCase() === lower ||
        item.name.toLowerCase().includes(lower) ||
        lower.includes(item.name.toLowerCase())
    );
    return match ? [match] : [];
  });
}

/** Small clothing image thumbnail. */
function ItemThumbnail({ item }: { item: ClothingItem }) {
  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imageUrl}
        alt={item.name}
        className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0 text-2xl">
      {CATEGORY_EMOJI[item.category] ?? CATEGORY_EMOJI["Other"]}
    </div>
  );
}

export default function OutfitsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [occasion, setOccasion] = useState("");
  const [weather, setWeather] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Shuffle state
  const [shuffledOutfit, setShuffledOutfit] = useState<ClothingItem[]>([]);
  const [shuffleLoading, setShuffleLoading] = useState(false);
  const [shuffleError, setShuffleError] = useState("");
  const [hasShuffled, setHasShuffled] = useState(false);

  // Outfit image generation state — keyed by index ("shuffle" or suggestion index)
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [outfitImages, setOutfitImages] = useState<Record<string, string>>({});
  const [outfitImageMimes, setOutfitImageMimes] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchWardrobe = useCallback(async () => {
    try {
      const res = await fetch("/api/wardrobe");
      if (!res.ok) throw new Error("Failed to fetch wardrobe");
      const items: ClothingItem[] = await res.json();
      setWardrobe(items);
      return items;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchWardrobe();
    }
  }, [session, fetchWardrobe]);

  const getSuggestions = async () => {
    setLoading(true);
    setError("");
    setHasSearched(true);
    setOutfitImages({});
    setOutfitImageMimes({});
    setImageErrors({});

    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion, weather }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get suggestions");
      }

      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get outfit suggestions");
    } finally {
      setLoading(false);
    }
  };

  const clearOutfitImageForKey = (key: string) => {
    setOutfitImages((prev) => { const next = { ...prev }; delete next[key]; return next; });
    setOutfitImageMimes((prev) => { const next = { ...prev }; delete next[key]; return next; });
    setImageErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  const shuffleOutfit = async () => {
    setShuffleLoading(true);
    setShuffleError("");
    setHasShuffled(true);
    clearOutfitImageForKey("shuffle");

    try {
      const items = wardrobe.length > 0 ? wardrobe : await fetchWardrobe();

      if (items.length === 0) {
        setShuffleError("No wardrobe items found. Add some clothes first!");
        setShuffledOutfit([]);
        return;
      }

      const outfit = buildShuffledOutfit(items);

      if (outfit.length === 0) {
        setShuffleError("Not enough items to build an outfit. Add more clothes!");
        setShuffledOutfit([]);
        return;
      }

      setShuffledOutfit(outfit);
    } catch (err) {
      setShuffleError(err instanceof Error ? err.message : "Failed to shuffle outfit");
    } finally {
      setShuffleLoading(false);
    }
  };

  const generateImage = async (
    key: string,
    items: ClothingItem[],
    extraItems?: string[]
  ) => {
    setGeneratingImage(key);
    clearOutfitImageForKey(key);

    try {
      // Build outfit items descriptor — use matched ClothingItems + any unmatched text items
      const outfitItems = items.map((i) => ({
        name: i.name,
        color: i.color,
        category: i.category,
      }));
      if (extraItems && extraItems.length > 0) {
        for (const name of extraItems) {
          if (!items.find((i) => i.name.toLowerCase() === name.toLowerCase())) {
            outfitItems.push({ name, color: "", category: "" });
          }
        }
      }
      const clothingImageUrls = items
        .map((i) => i.imageUrl)
        .filter(Boolean);

      const res = await fetch("/api/outfit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfitItems, clothingImageUrls }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Image generation failed");
      }

      const data = await res.json();
      setOutfitImages((prev) => ({ ...prev, [key]: data.imageData }));
      setOutfitImageMimes((prev) => ({ ...prev, [key]: data.mimeType || "image/png" }));
    } catch (err) {
      setImageErrors((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Failed to generate image",
      }));
    } finally {
      setGeneratingImage(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">👗 Outfit Ideas</h1>
          <p className="text-gray-600 mt-1">
            Shuffle a random outfit or let Gemini AI suggest styled looks from your wardrobe
          </p>
        </div>

        {/* Shuffle Card */}
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔀</span>
            <h2 className="text-lg font-semibold text-gray-800">Shuffle an Outfit</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Randomly pick items from your wardrobe to put together a look — no AI needed.
          </p>
          <button
            onClick={shuffleOutfit}
            disabled={shuffleLoading}
            className="btn-secondary flex items-center gap-2"
          >
            {shuffleLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                Shuffling...
              </>
            ) : (
              <>🔀 {hasShuffled ? "Shuffle Again" : "Shuffle Outfit"}</>
            )}
          </button>

          {shuffleError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {shuffleError}
              {shuffleError.includes("No wardrobe") && (
                <button
                  onClick={() => router.push("/wardrobe")}
                  className="ml-2 underline"
                >
                  Add clothes →
                </button>
              )}
            </div>
          )}

          {shuffledOutfit.length > 0 && (
            <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-3">Your shuffled outfit:</p>
              <div className="space-y-3">
                {shuffledOutfit.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <ItemThumbnail item={item} />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {item.category} · {item.color}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate Outfit Image button */}
              <div className="mt-4">
                <button
                  onClick={() => generateImage("shuffle", shuffledOutfit)}
                  disabled={generatingImage === "shuffle"}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  {generatingImage === "shuffle" ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      Generating image...
                    </>
                  ) : (
                    <>🖼️ Generate Outfit Image</>
                  )}
                </button>
                {imageErrors["shuffle"] && (
                  <p className="mt-2 text-sm text-red-600">{imageErrors["shuffle"]}</p>
                )}
                {outfitImages["shuffle"] && (
                  <div className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${outfitImageMimes["shuffle"] || "image/png"};base64,${outfitImages["shuffle"]}`}
                      alt="Generated outfit image"
                      className="w-full max-h-80 object-contain rounded-xl border border-gray-200"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      AI-generated image — results may vary
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Suggestions Card */}
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✨</span>
            <h2 className="text-lg font-semibold text-gray-800">AI Outfit Suggestions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Occasion (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((occ) => (
                  <button
                    key={occ}
                    onClick={() => setOccasion(occasion === occ ? "" : occ)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      occasion === occ
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {occ}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Season/Weather (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {WEATHER.map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeather(weather === w ? "" : w)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      weather === w
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={getSuggestions}
            disabled={loading}
            className="btn-primary mt-6 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating ideas...
              </>
            ) : (
              <>✨ Get AI Outfit Suggestions</>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <strong>Error:</strong> {error}
            {error.includes("No wardrobe items") && (
              <button
                onClick={() => router.push("/wardrobe")}
                className="ml-2 underline"
              >
                Add clothes →
              </button>
            )}
          </div>
        )}

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Here are your AI outfit ideas:
            </h2>
            {suggestions.map((suggestion, idx) => {
              const key = `suggestion-${idx}`;
              const matchedItems = matchItems(suggestion.items, wardrobe);
              return (
                <div key={idx} className="card">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{suggestion.title}</h3>
                      <span className="inline-block mt-1 px-3 py-0.5 bg-primary-100 text-primary-700 text-sm rounded-full">
                        {suggestion.occasion}
                      </span>
                    </div>
                    <span className="text-3xl">
                      {idx === 0 ? "👑" : idx === 1 ? "⭐" : "💫"}
                    </span>
                  </div>

                  {/* Items with thumbnails */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Outfit pieces:</p>
                    <div className="space-y-2">
                      {suggestion.items.map((itemName, i) => {
                        const wardrobeItem = wardrobe.find(
                          (w) =>
                            w.name.toLowerCase() === itemName.toLowerCase() ||
                            w.name.toLowerCase().includes(itemName.toLowerCase()) ||
                            itemName.toLowerCase().includes(w.name.toLowerCase())
                        );
                        return (
                          <div key={i} className="flex items-center gap-3">
                            {wardrobeItem ? (
                              <ItemThumbnail item={wardrobeItem} />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0 text-xl">
                                👕
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-medium text-gray-800">{itemName}</span>
                              {wardrobeItem && (
                                <span className="ml-2 text-xs text-gray-500">
                                  {wardrobeItem.category} · {wardrobeItem.color}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Why it works:</p>
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                  </div>

                  {/* Styling Tips */}
                  <div className="bg-primary-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-primary-800 mb-1">💡 Styling tips:</p>
                    <p className="text-sm text-primary-700">{suggestion.stylingTips}</p>
                  </div>

                  {/* Generate Outfit Image */}
                  <button
                    onClick={() => generateImage(key, matchedItems, suggestion.items)}
                    disabled={generatingImage === key}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    {generatingImage === key ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        Generating image...
                      </>
                    ) : (
                      <>🖼️ Generate Outfit Image</>
                    )}
                  </button>
                  {imageErrors[key] && (
                    <p className="mt-2 text-sm text-red-600">{imageErrors[key]}</p>
                  )}
                  {outfitImages[key] && (
                    <div className="mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:${outfitImageMimes[key] || "image/png"};base64,${outfitImages[key]}`}
                        alt="Generated outfit image"
                        className="w-full max-h-80 object-contain rounded-xl border border-gray-200"
                      />
                      <p className="text-xs text-gray-400 mt-1 text-center">
                        AI-generated image — results may vary
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasSearched && !loading && suggestions.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🤔</div>
            <p className="text-gray-600">No suggestions generated. Try again!</p>
          </div>
        )}

        {!hasSearched && !hasShuffled && (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-3">👗</div>
            <p className="text-lg">Shuffle a random outfit or ask AI to style you!</p>
          </div>
        )}
      </main>
    </div>
  );
}
