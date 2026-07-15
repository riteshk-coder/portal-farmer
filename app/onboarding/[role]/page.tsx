"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { IconLeaf, IconCheck } from "@tabler/icons-react";
import { roleConfig } from "@/lib/auth/roleConfig";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = (params.role as string) || "buyer";
  const mobile = searchParams.get("mobile") || "";
  const config = roleConfig[role];
  const { loginAsRole, showToast } = useApp();

  const [bankAcc, setBankAcc] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [gstin, setGstin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-s text-tx-s">
        Role not found.
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate updating bank info in DB and fetching auth token
    setTimeout(() => {
      showToast("Profile onboarding completed successfully!", "success");
      // Log in and route
      loginAsRole(role as any);
      router.push(config.redirectPath);
    }, 1500);
  };

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
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden shadow-md mb-3">
            <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-tx-p tracking-tight">Complete Onboarding</h1>
          <p className="text-xs text-tx-s mt-1">Configure your {config.label} payout and tax details</p>
        </div>

        <div className="bg-bg-p border border-bd-t rounded-xl p-6 sm:p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {role === "fpo" && (
              <>
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
              </>
            )}

            {role === "buyer" && (
              <Input
                label="Confirm GSTIN number"
                type="text"
                placeholder="e.g. 27AAACP1234A1Z1"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                floating={false}
                required
              />
            )}

            {role === "consultant" && (
              <div className="text-xs text-tx-s leading-relaxed font-semibold p-3 bg-bg-s rounded border border-bd-t mb-2">
                As an Agent/Consultant, your credentials will be audited by the MahaFPC compliance board. 
                Configure notifications matching your associated regional FPO lists to begin.
              </div>
            )}

            <Button type="submit" className="w-full flex justify-center items-center gap-2" disabled={isSubmitting}>
              <IconCheck className="w-4 h-4" /> {isSubmitting ? "Completing setup..." : "Go to Dashboard"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
