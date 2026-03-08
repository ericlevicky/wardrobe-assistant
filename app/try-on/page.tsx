"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import ClothingCard from "@/components/ClothingCard";
import { ClothingItem } from "@/lib/google-sheets";

export default function TryOnPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [resultImage, setResultImage] = useState<string>("");
  const [resultImageMime, setResultImageMime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchWardrobe = useCallback(async () => {
    try {
      const res = await fetch("/api/wardrobe");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWardrobeItems(data);
    } catch {
      setError("Failed to load wardrobe items.");
    } finally {
      setLoadingWardrobe(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchWardrobe();
    }
  }, [session, fetchWardrobe]);

  const handlePersonImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPersonImage(file);
    setPersonPreview(URL.createObjectURL(file));
    setResult("");
    setResultImage("");
    setResultImageMime("");
  };

  const toggleItem = (item: ClothingItem) => {
    setSelectedItems((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
    setResult("");
    setResultImage("");
    setResultImageMime("");
  };

  const handleTryOn = async () => {
    if (!personImage) {
      setError("Please upload a photo of yourself.");
      return;
    }
    if (selectedItems.length === 0) {
      setError("Please select at least one clothing item.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const formData = new FormData();
      formData.append("personImage", personImage);
      formData.append(
        "outfitItems",
        JSON.stringify(
          selectedItems.map((i) => ({ name: i.name, color: i.color, category: i.category }))
        )
      );
      formData.append("clothingImages", JSON.stringify([]));

      const res = await fetch("/api/try-on", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Try-on failed");
      }

      const data = await res.json();
      setResult(data.result || "");
      if (data.imageData) {
        setResultImage(data.imageData);
        setResultImageMime(data.imageMimeType || "image/png");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Virtual try-on failed");
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🪄 Virtual Try-On</h1>
          <p className="text-gray-600 mt-1">
            Upload your photo and select an outfit — Gemini AI will tell you how it looks!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Your Photo & Selected Items */}
          <div className="space-y-6">
            {/* Photo Upload */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                📸 Your Photo
              </h2>
              {personPreview ? (
                <div className="space-y-3">
                  <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-200">
                    <Image
                      src={personPreview}
                      alt="Your photo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setPersonImage(null);
                      setPersonPreview("");
                      setResult("");
                    }}
                    className="text-sm text-gray-500 hover:text-red-500"
                  >
                    Change photo
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-4xl mb-2">🤳</div>
                  <p className="text-sm text-gray-600">
                    Upload a photo of yourself
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Full body or half body works best</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePersonImageChange}
                className="hidden"
              />
            </div>

            {/* Selected Items */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Selected Outfit ({selectedItems.length} items)
              </h2>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Select clothing items from your wardrobe on the right →
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-primary-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {item.color} · {item.category}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleItem(item)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Try On Button */}
            <button
              onClick={handleTryOn}
              disabled={loading || !personImage || selectedItems.length === 0}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating your try-on...
                </>
              ) : (
                <>🪄 Try On This Outfit</>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Wardrobe Picker or Result */}
          <div className="space-y-6">
            {result || resultImage ? (
              /* AI Result */
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🪄</span>
                  <h2 className="text-lg font-semibold text-gray-800">
                    How This Outfit Looks on You
                  </h2>
                </div>

                {/* Generated Try-On Image */}
                {resultImage && (
                  <div className="mb-4">
                    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:${resultImageMime};base64,${resultImage}`}
                        alt="AI-generated try-on"
                        className="w-full object-contain max-h-[500px]"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      AI-generated image — results may vary
                    </p>
                  </div>
                )}

                {/* Text Description */}
                {result && (
                  <div className="prose prose-sm max-w-none">
                    {result.split("\n").map((line, i) => (
                      <p key={i} className={`text-gray-700 ${line === "" ? "mt-3" : ""}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setResult("");
                    setResultImage("");
                    setResultImageMime("");
                  }}
                  className="mt-4 btn-secondary text-sm"
                >
                  Try a different outfit
                </button>
              </div>
            ) : (
              /* Wardrobe Picker */
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Your Wardrobe — tap to select items
                </h2>
                {loadingWardrobe ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-gray-100 rounded-xl h-40 animate-pulse" />
                    ))}
                  </div>
                ) : wardrobeItems.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">👗</div>
                    <p className="text-gray-500 text-sm mb-3">
                      Your wardrobe is empty!
                    </p>
                    <button
                      onClick={() => router.push("/wardrobe")}
                      className="btn-primary text-sm"
                    >
                      Add Clothes
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                    {wardrobeItems.map((item) => (
                      <ClothingCard
                        key={item.id}
                        item={item}
                        selectable
                        selected={!!selectedItems.find((i) => i.id === item.id)}
                        onSelect={toggleItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
