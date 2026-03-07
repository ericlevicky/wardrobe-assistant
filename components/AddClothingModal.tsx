"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface AddClothingModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClothingModal({ onClose, onSuccess }: AddClothingModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "Tops",
    color: "",
    tags: "",
    imageUrl: "",
    driveFileId: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ["Tops", "Bottoms", "Dresses", "Outerwear", "Footwear", "Accessories", "Other"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("image/")) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setError("");
    }
  };

  const uploadImage = async (imageFile: File): Promise<{ imageUrl: string; fileId: string; analysis: { name: string; category: string; color: string; tags: string } }> => {
    const data = new FormData();
    data.append("image", imageFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: data,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Upload failed");
    }

    return res.json();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError("");

    try {
      const result = await uploadImage(file);
      setFormData({
        name: result.analysis.name || "",
        category: result.analysis.category || "Tops",
        color: result.analysis.color || "",
        tags: result.analysis.tags || "",
        imageUrl: result.imageUrl || "",
        driveFileId: result.fileId || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let formDataToSubmit = formData;

      // If there's a file selected but the image hasn't been uploaded yet, upload it now
      if (file && !formData.imageUrl) {
        const result = await uploadImage(file);
        formDataToSubmit = {
          ...formData,
          imageUrl: result.imageUrl || "",
          driveFileId: result.fileId || "",
        };
        setFormData(formDataToSubmit);
      }

      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formDataToSubmit),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add item");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Add Clothing Item</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo of Clothing *
            </label>
            {preview ? (
              <div className="relative">
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200">
                  <Image src={preview} alt="Preview" fill className="object-contain" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                    setFormData((f) => ({ ...f, imageUrl: "", driveFileId: "" }));
                  }}
                  className="mt-2 text-sm text-gray-500 hover:text-red-500"
                >
                  Change photo
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <div className="text-4xl mb-2">📸</div>
                <p className="text-sm text-gray-600">
                  Drop an image here or <span className="text-primary-600 font-medium">click to browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Analyze Button */}
          {file && !formData.imageUrl && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing with AI...
                </>
              ) : (
                <>✨ Analyze with Gemini AI</>
              )}
            </button>
          )}

          {formData.imageUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700 flex items-center gap-2">
              ✓ Image uploaded & analyzed
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                className="input-field"
                placeholder="e.g., Blue Denim Jacket"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                  className="input-field"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color *</label>
                <input
                  type="text"
                  required
                  value={formData.color}
                  onChange={(e) => setFormData((f) => ({ ...f, color: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., Navy Blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData((f) => ({ ...f, tags: e.target.value }))}
                className="input-field"
                placeholder="e.g., casual, summer, everyday"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim() || !formData.color.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  "Add to Wardrobe"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
