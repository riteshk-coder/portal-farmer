"use client";

import React, { useState, useEffect } from "react";
import { IconCheck, IconSearch, IconLoader2, IconAlertCircle } from "@tabler/icons-react";

interface Category {
  id: number;
  name: string;
  emoji?: string;
  imagePath?: string;
}

interface ProductType {
  id: number;
  name: string;
  categoryId: number;
  imagePath?: string;
}

interface SelectedRow {
  categoryId: number;
  productTypeId?: number;
  customProductName?: string;
}

interface PreferenceStepProductProps {
  selectedCategoryIds: number[];
  categories: Category[];
  initialRows: SelectedRow[];
  onSave: (data: { categories: number[]; product_types: number[]; rows: SelectedRow[] }) => void;
  onBack: () => void;
  role: "buyer" | "fpo";
  isSubmitting?: boolean;
}

export const PreferenceStepProduct: React.FC<PreferenceStepProductProps> = ({
  selectedCategoryIds,
  categories,
  initialRows,
  onSave,
  onBack,
  role,
  isSubmitting = false,
}) => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection state
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [customVarieties, setCustomVarieties] = useState<Record<number, string>>({}); // category_id -> custom_name
  const [showCustomInputs, setShowCustomInputs] = useState<Record<number, boolean>>({}); // category_id -> boolean

  const isBuyer = role === "buyer";
  const ringColorClass = isBuyer ? "ring-2 ring-amb" : "ring-2 ring-teal-accent";
  const borderHighlight = isBuyer ? "border-amb text-amb" : "border-teal-accent text-teal-accent";
  const badgeColorClass = isBuyer ? "bg-amb text-white" : "bg-teal-accent text-white";

  // Load products for selected categories
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const promises = selectedCategoryIds.map(async (catId) => {
          const res = await fetch(`http://localhost:8000/lots/product-categories/${catId}/products`, { headers });
          if (res.ok) {
            const data = await res.json();
            return { catId, data };
          }
          return { catId, data: [] };
        });
        const results = await Promise.all(promises);
        
        const merged: ProductType[] = [];
        results.forEach(({ data }) => {
          data.forEach((p: any) => {
            merged.push(p);
          });
        });
        setProducts(merged);

        // Pre-fill selection from initial rows
        const matchedProductIds: number[] = [];
        const matchedCustoms: Record<number, string> = {};
        const matchedCustomInputs: Record<number, boolean> = {};

        initialRows.forEach((row) => {
          if (row.productTypeId) {
            matchedProductIds.push(row.productTypeId);
          } else if (row.customProductName !== undefined) {
            matchedCustoms[row.categoryId] = row.customProductName;
            matchedCustomInputs[row.categoryId] = true;
          }
        });

        setSelectedProductIds(matchedProductIds);
        setCustomVarieties(matchedCustoms);
        setShowCustomInputs(matchedCustomInputs);

      } catch (err) {
        console.error("Failed to load products for preference page 2:", err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedCategoryIds.length > 0) {
      fetchAllProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [selectedCategoryIds, initialRows]);

  const handleProductToggle = (id: number) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((x) => x !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  const handleSelectAllGlobal = () => {
    const activeCatIds = activeCategories.map((c) => c.id);
    const activeProducts = products.filter((p) => activeCatIds.includes(p.categoryId));
    const activeProductIds = activeProducts.map((p) => p.id);
    const allSelected = activeProductIds.length > 0 && activeProductIds.every((id) => selectedProductIds.includes(id));
    
    if (allSelected) {
      // Deselect all active products
      setSelectedProductIds(selectedProductIds.filter((id) => !activeProductIds.includes(id)));
    } else {
      // Select all active products
      const newSelection = Array.from(new Set([...selectedProductIds, ...activeProductIds]));
      setSelectedProductIds(newSelection);
    }
  };

  const handleToggleCategoryProducts = (catId: number, catProducts: ProductType[]) => {
    const catProductIds = catProducts.map((p) => p.id);
    const allSelected = catProductIds.length > 0 && catProductIds.every((id) => selectedProductIds.includes(id));
    
    if (allSelected) {
      setSelectedProductIds(selectedProductIds.filter((id) => !catProductIds.includes(id)));
    } else {
      const newSelection = Array.from(new Set([...selectedProductIds, ...catProductIds]));
      setSelectedProductIds(newSelection);
    }
  };

  const handleCustomToggle = (catId: number) => {
    const isShowing = showCustomInputs[catId];
    if (isShowing) {
      setShowCustomInputs({ ...showCustomInputs, [catId]: false });
      const updatedCustoms = { ...customVarieties };
      delete updatedCustoms[catId];
      setCustomVarieties(updatedCustoms);
    } else {
      setShowCustomInputs({ ...showCustomInputs, [catId]: true });
      setCustomVarieties({ ...customVarieties, [catId]: "" });
    }
  };

  const handleSave = () => {
    // Construct rows
    const rows: SelectedRow[] = [];
    
    // Add selected standard product types
    selectedProductIds.forEach((prodId) => {
      const prod = products.find((p) => p.id === prodId);
      if (prod) {
        rows.push({
          categoryId: prod.categoryId,
          productTypeId: prodId,
        });
      }
    });

    // Add custom product names
    Object.keys(customVarieties).forEach((catKey) => {
      const catId = parseInt(catKey);
      if (showCustomInputs[catId]) {
        rows.push({
          categoryId: catId,
          customProductName: customVarieties[catId] || "",
        });
      }
    });

    // If a category was chosen on page 1 but has no products selected on page 2, we still keep it in categories list
    const finalCategoryIds = Array.from(
      new Set([
        ...selectedCategoryIds,
        ...rows.map((r) => r.categoryId),
      ])
    );

    const finalProductTypeIds = selectedProductIds;

    onSave({
      categories: finalCategoryIds,
      product_types: finalProductTypeIds,
      rows,
    });
  };

  // Group categories that were selected
  const activeCategories = categories.filter((cat) => selectedCategoryIds.includes(cat.id));

  // Client side query filtering
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-tx-s">
        <IconLoader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-xs font-semibold">Loading product variety list...</p>
      </div>
    );
  }

  // Check standard products selected state for active categories
  const activeCatIds = activeCategories.map((c) => c.id);
  const activeProducts = products.filter((p) => activeCatIds.includes(p.categoryId));
  const activeProductIds = activeProducts.map((p) => p.id);
  const allSelectedGlobal = activeProductIds.length > 0 && activeProductIds.every((id) => selectedProductIds.includes(id));

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <IconSearch className="absolute left-3 top-2.5 h-4.5 w-4.5 text-tx-t" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-bg-s border border-bd-s rounded-xl pl-10 pr-4 py-2 text-xs text-tx-p focus:outline-none focus:border-primary placeholder:text-tx-t font-semibold"
        />
      </div>

      {/* Global toggle row */}
      {activeCategories.length > 0 && products.length > 0 && (
        <div className="flex items-center justify-between text-[11px] font-semibold bg-bg-s border border-bd-s px-3 py-2 rounded-xl">
          <span className="text-tx-s">
            {selectedProductIds.length} variety selected
          </span>
          <button
            type="button"
            onClick={handleSelectAllGlobal}
            className={`hover:underline font-bold transition-all ${
              isBuyer ? "text-amb hover:text-amb-m" : "text-teal-accent hover:text-teal-m"
            }`}
          >
            {allSelectedGlobal ? "Deselect All Products" : "Select All Products"}
          </button>
        </div>
      )}

      {activeCategories.length === 0 ? (
        <div className="text-center py-8 text-tx-s border border-dashed border-bd-s rounded-xl">
          <IconAlertCircle className="w-8 h-8 mx-auto mb-2 text-tx-t" />
          <p className="text-xs font-bold">No categories selected.</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
          {activeCategories.map((cat) => {
            const catProducts = filteredProducts.filter((p) => p.categoryId === cat.id);
            const isCustomActive = showCustomInputs[cat.id] || false;

            if (catProducts.length === 0 && !isCustomActive && searchQuery !== "") {
              return null; // hide category group if search returns nothing
            }

            const isAllCatSelected = catProducts.length > 0 && catProducts.every((p) => selectedProductIds.includes(p.id));

            return (
              <div key={cat.id} className="space-y-3 pb-4 border-b border-bd-t last:border-0 last:pb-0">
                <div className="flex justify-between items-center sticky top-0 bg-bg-p py-1 z-10 border-b border-bd-t mb-2">
                  <h3 className="text-xs font-bold text-tx-p flex items-center gap-1.5">
                    <span className="text-base">{cat.emoji || "🌱"}</span>
                    <span>{cat.name}</span>
                  </h3>
                  {catProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleToggleCategoryProducts(cat.id, catProducts)}
                      className={`text-[10px] font-bold hover:underline transition-all ${
                        isBuyer ? "text-amb hover:text-amb-m" : "text-teal-accent hover:text-teal-m"
                      }`}
                    >
                      {isAllCatSelected ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 justify-items-center">
                  {/* Products list circles */}
                  {catProducts.map((p) => {
                    const isSelected = selectedProductIds.includes(p.id);
                    const imageToShow = p.imagePath || "/logo.jpg";

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleProductToggle(p.id)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group w-18 select-none"
                      >
                        {/* Circular Image Container */}
                        <div
                          className={`w-16 h-16 rounded-full overflow-hidden border bg-bg-s flex items-center justify-center relative shadow-sm group-hover:scale-105 transition-all ${
                            isSelected ? `${ringColorClass} ${borderHighlight}` : "border-bd-s"
                          }`}
                        >
                          <img
                            src={imageToShow}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/logo.jpg";
                            }}
                          />
                          {/* Check overlay */}
                          {isSelected && (
                            <div className={`absolute inset-0 bg-black/20 flex items-center justify-center z-10`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${badgeColorClass}`}>
                                <IconCheck className="w-3 h-3" />
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Center Aligned Text */}
                        <span className="text-[10px] font-bold text-tx-s group-hover:text-tx-p text-center leading-tight line-clamp-2">
                          {p.name}
                        </span>
                      </div>
                    );
                  })}

                  {/* "Other" Option Circle */}
                  <div
                    onClick={() => handleCustomToggle(cat.id)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group w-18 select-none"
                  >
                    <div
                      className={`w-16 h-16 rounded-full overflow-hidden border bg-bg-s flex flex-col items-center justify-center relative shadow-sm group-hover:scale-105 transition-all ${
                        isCustomActive ? `${ringColorClass} ${borderHighlight}` : "border-bd-s border-dashed"
                      }`}
                    >
                      <span className="text-xl font-bold">+</span>
                      {isCustomActive && (
                        <div className={`absolute inset-0 bg-black/20 flex items-center justify-center z-10`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${badgeColorClass}`}>
                            <IconCheck className="w-3 h-3" />
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-tx-s group-hover:text-tx-p text-center leading-tight">
                      Other
                    </span>
                  </div>
                </div>

                {/* Custom Name text input */}
                {isCustomActive && (
                  <div className="mt-3 pl-2 max-w-sm">
                    <input
                      type="text"
                      placeholder={`Enter custom variety name (e.g. Turmeric Tea Blend)`}
                      value={customVarieties[cat.id] || ""}
                      onChange={(e) =>
                        setCustomVarieties({
                          ...customVarieties,
                          [cat.id]: e.target.value,
                        })
                      }
                      className="w-full bg-bg-s border border-bd-s rounded-lg px-2.5 py-1.5 text-xs text-tx-p focus:outline-none focus:border-primary placeholder:text-tx-t font-semibold"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-bd-t">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-bd-s rounded-xl text-xs font-bold text-tx-s hover:bg-bg-s hover:text-tx-p transition-all"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting || (selectedProductIds.length === 0 && Object.keys(customVarieties).length === 0)}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            (selectedProductIds.length === 0 && Object.keys(customVarieties).length === 0) || isSubmitting
              ? "bg-bg-s border border-bd-s text-tx-t cursor-not-allowed"
              : isBuyer
              ? "bg-amb text-white hover:bg-amb/90"
              : "bg-teal-accent text-white hover:bg-teal-accent/90"
          }`}
        >
          {isSubmitting ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
};
