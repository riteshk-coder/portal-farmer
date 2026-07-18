"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { PreferenceStepCategory } from "./PreferenceStepCategory";
import { PreferenceStepProduct } from "./PreferenceStepProduct";

interface PreferenceItem {
  categoryId: number;
  productTypeId?: number;
  customProductName?: string;
}

interface ProductPreferenceSelectorProps {
  preferences: PreferenceItem[];
  onChange: (newPrefs: PreferenceItem[]) => void;
  role?: "buyer" | "fpo";
  isOnboarding?: boolean;
  onOnboardingComplete?: () => void;
  bankAccountNum?: string; // Passed from FPO bank step if onboarding
  bankIfsc?: string; // Passed from FPO bank step if onboarding
}

export const ProductPreferenceSelector: React.FC<ProductPreferenceSelectorProps> = ({
  preferences,
  onChange,
  role = "buyer",
  isOnboarding = false,
  onOnboardingComplete,
  bankAccountNum,
  bankIfsc,
}) => {
  const { categories, showToast, fetchDataFromBackend } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill categories from initial preferences
  useEffect(() => {
    if (preferences.length > 0 && selectedCategoryIds.length === 0) {
      const catIds = Array.from(new Set(preferences.map((p) => p.categoryId).filter(Boolean)));
      setSelectedCategoryIds(catIds);
    }
  }, [preferences]);

  const handleSave = async (data: { categories: number[]; product_types: number[]; rows: PreferenceItem[] }) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // 1. Save preferences
      const resPrefs = await fetch(`http://localhost:8000/lots/${role}s/me/product-preferences`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          categories: data.categories,
          product_types: data.product_types,
          rows: data.rows.map(r => ({
            category_id: r.categoryId,
            product_type_id: r.productTypeId,
            custom_product_name: r.customProductName
          }))
        }),
      });

      if (!resPrefs.ok) {
        throw new Error("Failed to save product preferences.");
      }

      // Update parent component state
      onChange(data.rows);

      // 2. If onboarding, complete onboarding
      if (isOnboarding) {
        let bodyContent = {};
        if (role === "fpo") {
          bodyContent = {
            bank_account_num: bankAccountNum || null,
            bank_ifsc: bankIfsc || null,
          };
        }

        const resComplete = await fetch(`http://localhost:8000/lots/${role}s/me/onboarding-complete`, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyContent),
        });

        if (!resComplete.ok) {
          throw new Error("Failed to complete onboarding.");
        }

        showToast("Onboarding setup completed successfully!", "success");
        if (onOnboardingComplete) {
          onOnboardingComplete();
        }
      } else {
        showToast("Preferences updated successfully!", "success");
        await fetchDataFromBackend();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialRows = preferences.map((p) => ({
    categoryId: p.categoryId,
    productTypeId: p.productTypeId,
    customProductName: p.customProductName,
  }));

  if (step === 1) {
    return (
      <PreferenceStepCategory
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        onChange={setSelectedCategoryIds}
        onNext={() => setStep(2)}
        role={role}
      />
    );
  }

  return (
    <PreferenceStepProduct
      selectedCategoryIds={selectedCategoryIds}
      categories={categories}
      initialRows={initialRows}
      onSave={handleSave}
      onBack={() => setStep(1)}
      role={role}
      isSubmitting={isSubmitting}
    />
  );
};
