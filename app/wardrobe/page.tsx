"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/Navigation";
import ClothingCard from "@/components/ClothingCard";
import AddClothingModal from "@/components/AddClothingModal";
import { ClothingItem } from "@/lib/google-sheets";

export default function WardrobePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  const categories = ["All", "Tops", "Bottoms", "Dresses", "Outerwear", "Footwear", "Accessories", "Other"];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchWardrobe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wardrobe");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data);
    } catch {
      setError("Failed to load wardrobe. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchWardrobe();
    }
  }, [session, fetchWardrobe]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this item from your wardrobe?")) return;
    try {
      const res = await fetch(`/api/wardrobe/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("Failed to delete item.");
    }
  };

  const filteredItems =
    filter === "All" ? items : items.filter((item) => item.category === filter);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wardrobe</h1>
            <p className="text-gray-600 mt-1">
              {items.length} item{items.length !== 1 ? "s" : ""} in your closet
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Add Clothing
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === cat
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-1 text-xs opacity-70">
                  ({items.filter((i) => i.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Clothing Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-56 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">
              {items.length === 0 ? "👗" : "🔍"}
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {items.length === 0 ? "Your wardrobe is empty" : "No items in this category"}
            </h3>
            <p className="text-gray-500 mb-6">
              {items.length === 0
                ? "Start by adding photos of your clothes!"
                : "Try a different category filter."}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                Add Your First Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <ClothingCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddClothingModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchWardrobe();
          }}
        />
      )}
    </div>
  );
}
