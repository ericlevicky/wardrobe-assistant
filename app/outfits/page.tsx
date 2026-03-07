"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { OutfitSuggestion } from "@/lib/gemini";

const OCCASIONS = ["Casual", "Work/Office", "Date Night", "Party", "Gym/Workout", "Outdoor", "Formal"];
const WEATHER = ["Spring", "Summer", "Fall", "Winter", "Rainy", "Hot & Sunny", "Cold"];

export default function OutfitsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [occasion, setOccasion] = useState("");
  const [weather, setWeather] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const getSuggestions = async () => {
    setLoading(true);
    setError("");
    setHasSearched(true);

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
          <h1 className="text-3xl font-bold text-gray-900">✨ Outfit Ideas</h1>
          <p className="text-gray-600 mt-1">
            Let Gemini AI suggest perfect outfits from your wardrobe
          </p>
        </div>

        {/* Filters Card */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">What are you dressing for?</h2>
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
              <>✨ Get Outfit Suggestions</>
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

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Here are your outfit ideas:
            </h2>
            {suggestions.map((suggestion, idx) => (
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

                {/* Items */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Outfit pieces:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.items.map((item, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        👕 {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Why it works:</p>
                  <p className="text-sm text-gray-600">{suggestion.description}</p>
                </div>

                {/* Styling Tips */}
                <div className="bg-primary-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-primary-800 mb-1">💡 Styling tips:</p>
                  <p className="text-sm text-primary-700">{suggestion.stylingTips}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasSearched && !loading && suggestions.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🤔</div>
            <p className="text-gray-600">No suggestions generated. Try again!</p>
          </div>
        )}

        {!hasSearched && (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-3">✨</div>
            <p className="text-lg">Click &quot;Get Outfit Suggestions&quot; to let AI style you!</p>
          </div>
        )}
      </main>
    </div>
  );
}
