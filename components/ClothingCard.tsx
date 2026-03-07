"use client";

import Image from "next/image";
import { ClothingItem } from "@/lib/google-sheets";

interface ClothingCardProps {
  item: ClothingItem;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (item: ClothingItem) => void;
}

export default function ClothingCard({
  item,
  onDelete,
  selectable,
  selected,
  onSelect,
}: ClothingCardProps) {
  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(item);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 group ${
        selectable
          ? "cursor-pointer hover:shadow-md"
          : "hover:shadow-sm"
      } ${selected ? "border-primary-500 ring-2 ring-primary-200" : "border-gray-100"}`}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative w-full h-40 bg-gray-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            👕
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">{item.category}</span>
          <span className="text-xs text-gray-500">{item.color}</span>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="mt-2 w-full text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
