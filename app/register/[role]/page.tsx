"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { IconLeaf, IconArrowLeft } from "@tabler/icons-react";
import { roleConfig } from "@/lib/auth/roleConfig";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  
  const role = (params.role as string) || "buyer";
  const config = roleConfig[role];
  const { showToast } = useApp();

  const [formState, setFormState] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!config || role === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-s text-tx-s">
        Registration not available for this role.
      </div>
    );
  }

  const handleInputChange = (field: string, val: string) => {
    setFormState((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      alert("Please accept the terms and conditions.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        role,
        fullName: formState.fullName || "",
        email: formState.email || "",
        mobile: formState.mobile || "",
        companyName: formState.companyName || "",
        businessType: formState.businessType || "Trader",
        gstin: formState.gstin || "",
        fpoRegNumber: formState.fpoRegNumber || "",
        state: formState.state || "",
        district: formState.district || "",
        village: formState.village || "",
        associatedFpo: formState.associatedFpo || "",
        idProof: formState.idProof || "",
      };

      const response = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Registration failed.");
      }

      showToast("Account created successfully!", "success");
      // Redirect to login prefilled with email or mobile number
      router.push(`/login/${role}?email=${encodeURIComponent(payload.email || "")}`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldDetails = (field: string) => {
    switch (field) {
      case "fullName":
        return { label: "Full Name", placeholder: "e.g. Aditya Roy", type: "text" };
      case "companyName":
        return { label: "Company / Business Name", placeholder: "e.g. Pro Traders LLC", type: "text" };
      case "email":
        return { label: "Business Email", placeholder: "e.g. aditya@traders.com", type: "email" };
      case "mobile":
        return { label: "Aadhaar-linked Mobile Number", placeholder: "e.g. 9876543210", type: "tel" };
      case "gstin":
        return { label: "GSTIN Number (Optional)", placeholder: "e.g. 27AAACP1234A1Z1", type: "text" };
      case "fpoRegNumber":
        return { label: "FPO Registration Number", placeholder: "e.g. FPO-MH-9021", type: "text" };
      case "state":
        return { label: "State", placeholder: "e.g. Maharashtra", type: "text" };
      case "district":
        return { label: "District", placeholder: "e.g. Nashik", type: "text" };
      case "village":
        return { label: "Village / Town", placeholder: "e.g. Pimpalgaon", type: "text" };
      case "idProof":
        return { label: "ID Proof Document PDF Link", placeholder: "e.g. https://doc-vault.com/aadhaar.pdf", type: "text" };
      default:
        return { label: field, placeholder: "", type: "text" };
    }
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
        className="relative z-10 w-full max-w-lg my-8"
      >
        <button
          onClick={() => router.push(`/login/${role}`)}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors mb-6"
        >
          <IconArrowLeft className="w-4 h-4" /> Back to Login
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden shadow-md mb-3">
            <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-tx-p tracking-tight">
            Register as {config.label}
          </h1>
          <p className="text-xs text-tx-s mt-1">Join the verified MahaFPC turmeric marketplace</p>
        </div>

        {/* Register Card */}
        <div className="bg-bg-p border border-bd-t rounded-xl p-6 sm:p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {config.registerFields.map((field) => {
              if (field === "businessType") {
                return (
                  <div key={field}>
                    <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">
                      Business Type
                    </label>
                    <select
                      value={formState.businessType || "Trader"}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="Trader">Trader</option>
                      <option value="Exporter">Exporter</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Processor">Processor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                );
              }

              if (field === "associatedFpo") {
                return (
                  <div key={field}>
                    <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">
                      Associated FPO / Cooperative
                    </label>
                    <select
                      value={formState.associatedFpo || "Nashik Agro FPO"}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="Nashik Agro FPO">Nashik Agro FPO</option>
                      <option value="Pune Agro FPO">Pune Agro FPO</option>
                      <option value="Salem Farmers FPO">Salem Farmers FPO</option>
                      <option value="Erode Agro FPO">Erode Agro FPO</option>
                    </select>
                  </div>
                );
              }

              const details = getFieldDetails(field);
              return (
                <Input
                  key={field}
                  label={details.label}
                  type={details.type}
                  placeholder={details.placeholder}
                  value={formState[field] || ""}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  floating={false}
                  required={field !== "gstin" && field !== "fpoRegNumber" && field !== "idProof"}
                />
              );
            })}

            <div className="flex items-center gap-2 pt-2">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 text-primary bg-bg-p border-bd-s rounded focus:ring-primary focus:ring-2"
                required
              />
              <label htmlFor="terms" className="text-xs text-tx-s font-semibold cursor-pointer">
                I accept the marketplace Terms & Conditions and agree to verify my credentials.
              </label>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Complete Registration →"}
            </Button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-bd-t">
            <p className="text-xs text-tx-s">
              Already registered?{" "}
              <button
                onClick={() => router.push(`/login/${role}`)}
                className="font-bold text-primary hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
