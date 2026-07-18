"use client";

import React from "react";
import { IconCheck } from "@tabler/icons-react";

interface Category {
  id: number;
  name: string;
  emoji?: string;
  imagePath?: string;
}

interface PreferenceStepCategoryProps {
  categories: Category[];
  selectedCategoryIds: number[];
  onChange: (ids: number[]) => void;
  onNext: () => void;
  role: "buyer" | "fpo";
}

export const PreferenceStepCategory: React.FC<PreferenceStepCategoryProps> = ({
  categories,
  selectedCategoryIds,
  onChange,
  onNext,
  role,
}) => {
  const handleToggle = (id: number) => {
    if (selectedCategoryIds.includes(id)) {
      onChange(selectedCategoryIds.filter((x) => x !== id));
    } else {
      onChange([...selectedCategoryIds, id]);
    }
  };

  const isBuyer = role === "buyer";
  const ringColorClass = isBuyer ? "ring-2 ring-amb" : "ring-2 ring-teal-accent";
  const borderHighlight = isBuyer ? "border-amb text-amb" : "border-teal-accent text-teal-accent";
  const badgeColorClass = isBuyer ? "bg-amb text-white" : "bg-teal-accent text-white";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-base font-bold text-tx-p">What product categories do you trade in?</h2>
        <div className="flex items-center justify-between mt-2 max-w-[280px] mx-auto text-[11px] font-semibold">
          <span className="text-tx-s">
            {selectedCategoryIds.length} category selected
          </span>
          <button
            type="button"
            onClick={() => {
              if (selectedCategoryIds.length === categories.length) {
                onChange([]);
              } else {
                onChange(categories.map((c) => c.id));
              }
            }}
            className={`hover:underline font-bold transition-all ${
              isBuyer ? "text-amb hover:text-amb-m" : "text-teal-accent hover:text-teal-m"
            }`}
          >
            {selectedCategoryIds.length === categories.length ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const isSelected = selectedCategoryIds.includes(cat.id);
          const imageToShow = cat.imagePath || "/logo.jpg";
          
          return (
            <div
              key={cat.id}
              onClick={() => handleToggle(cat.id)}
              className={`relative cursor-pointer overflow-hidden rounded-xl border bg-bg-s p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md select-none group flex flex-col justify-between ${
                isSelected ? `${ringColorClass} ${borderHighlight}` : "border-bd-s text-tx-p"
              }`}
              style={{ minHeight: "120px" }}
            >
              {/* Card background image overlay */}
              <div className="absolute inset-0 z-0">
                <img
                  src={imageToShow}
                  alt={cat.name}
                  className="w-full h-full object-cover opacity-20 dark:opacity-10 transition-opacity group-hover:opacity-35"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-s via-bg-s/90 to-transparent" />
              </div>

              {/* Card Content */}
              <div className="relative z-10 flex flex-col justify-between h-full w-full">
                <div className="text-2xl mt-1">{cat.emoji || "🌱"}</div>
                <div className="font-bold text-[12.5px] tracking-tight leading-snug mt-4">
                  {cat.name}
                </div>
              </div>

              {/* Checkmark badge overlay */}
              {isSelected && (
                <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm z-20 ${badgeColorClass}`}>
                  <IconCheck className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-bd-t">
        <button
          type="button"
          onClick={onNext}
          disabled={selectedCategoryIds.length === 0}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            selectedCategoryIds.length === 0
              ? "bg-bg-s border border-bd-s text-tx-t cursor-not-allowed"
              : isBuyer
              ? "bg-amb text-white hover:bg-amb/90"
              : "bg-teal-accent text-white hover:bg-teal-accent/90"
          }`}
        >
          Next Step
        </button>
      </div>
    </div>
  );
};
