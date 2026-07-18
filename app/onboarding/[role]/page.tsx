"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { IconLeaf, IconCheck } from "@tabler/icons-react";
import { roleConfig } from "@/lib/auth/roleConfig";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductPreferenceSelector } from "@/components/ProductPreferenceSelector";

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = (params.role as string) || "buyer";
  const mobile = searchParams.get("mobile") || "";
  const config = roleConfig[role];
  const { loginAsRole } = useApp();

  const [bankAcc, setBankAcc] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [preferences, setPreferences] = useState<{ categoryId: number; productTypeId?: number; customProductName?: string }[]>([]);
  const [fpoStep, setFpoStep] = useState<1 | 2>(1); // Step 1: Bank Details, Step 2: Preferences

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-s text-tx-s">
        Role not found.
      </div>
    );
  }

  const handleComplete = () => {
    loginAsRole(role as any);
    router.push(config.redirectPath);
  };

  const handleEscrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleComplete();
  };

  const isWideBox = role === "buyer" || (role === "fpo" && fpoStep === 2);

  return (
    <div className="min-h-screen bg-bg-s flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-bg/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-info-bg/30 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-10 w-full transition-all duration-300 ${isWideBox ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden shadow-md mb-3">
            <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-tx-p tracking-tight">Complete Onboarding</h1>
          <p className="text-xs text-tx-s mt-1">Configure your {config.label} payout and preferences details</p>
        </div>

        <div className="bg-bg-p border border-bd-t rounded-xl p-6 sm:p-8 shadow-card">
          {role === "fpo" && fpoStep === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFpoStep(2);
              }}
              className="space-y-6"
            >
              <div className="pb-2 border-b border-bd-t">
                <h3 className="text-sm font-bold text-tx-p">Payout Banking Details</h3>
                <p className="text-[10px] text-tx-s mt-0.5">Please provide FPO bank details to receive digital crop splits and payout releases.</p>
              </div>
              <div className="space-y-4">
                <Input
                  label="Bank Account Number"
                  type="text"
                  placeholder="e.g. 501000921092"
                  value={bankAcc}
                  onChange={(e) => setBankAcc(e.target.value)}
                  floating={false}
                  required
                />
                <Input
                  label="Bank IFSC Code"
                  type="text"
                  placeholder="e.g. HDFC0000123"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  floating={false}
                  required
                />
              </div>
              <Button type="submit" className="w-full flex justify-center items-center gap-2 py-2.5">
                <span>Continue to Product Preferences</span>
              </Button>
            </form>
          )}

          {role === "fpo" && fpoStep === 2 && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-bd-t">
                <h3 className="text-sm font-bold text-tx-p">FPO Product Focus Preferences</h3>
                <p className="text-[10px] text-tx-s mt-0.5">Select category or specific product types produced by your farmers to match with buyers.</p>
              </div>
              <ProductPreferenceSelector
                preferences={preferences}
                onChange={setPreferences}
                role="fpo"
                isOnboarding={true}
                onOnboardingComplete={handleComplete}
                bankAccountNum={bankAcc}
                bankIfsc={bankIfsc}
              />
            </div>
          )}

          {role === "buyer" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-bd-t">
                <h3 className="text-sm font-bold text-tx-p">Select Procurement Preferences</h3>
                <p className="text-[10px] text-tx-s mt-0.5">Please select at least one product preference to match with relevant supplier lots.</p>
              </div>
              <ProductPreferenceSelector
                preferences={preferences}
                onChange={setPreferences}
                role="buyer"
                isOnboarding={true}
                onOnboardingComplete={handleComplete}
              />
            </div>
          )}

          {role === "escrow" && (
            <form onSubmit={handleEscrowSubmit} className="space-y-6">
              <div className="text-xs text-tx-s leading-relaxed font-semibold p-3 bg-bg-s rounded border border-bd-t mb-2">
                As an Escrow Service Officer, your credentials will be audited by the MahaFPC compliance board.
                You will have access to ledger verification and fund release controls.
              </div>
              <Button type="submit" className="w-full flex justify-center items-center gap-2 py-2.5">
                <IconCheck className="w-4 h-4" /> Go to Dashboard
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
