"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { IconLeaf, IconLock } from "@tabler/icons-react";
import { useApp } from "@/context/AppContext";
import { roleConfig } from "@/lib/auth/roleConfig";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mobile = searchParams.get("mobile") || "";
  const role = searchParams.get("role") || "buyer";
  const purpose = searchParams.get("purpose") || "login";
  
  const config = roleConfig[role];
  const { loginAsRole, showToast } = useApp();

  const [otpInput, setOtpInput] = useState("");
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      alert("Please enter a valid 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: mobile,
          otp: otpInput.trim(),
          purpose: purpose,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Incorrect OTP code.");
      }

      showToast("OTP verified successfully!", "success");

      if (purpose === "login") {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("user_name", data.name);
        localStorage.setItem("user_email", data.email || "");
        localStorage.setItem("user_position", data.position || "");
        loginAsRole(role as any);
        if ((role === "buyer" || role === "fpo") && data.onboardingCompleted === false) {
          router.push(`/onboarding/${role}`);
        } else {
          router.push(config.redirectPath);
        }
      } else {
        // Registration success redirect -> proceed to onboarding profile completion
        router.push(`/onboarding/${role}?mobile=${mobile}`);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setTimer(30);
    try {
      const response = await fetch("http://localhost:8000/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: mobile,
          purpose: purpose,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to resend OTP.");
      }
      showToast("Resent successfully! Please check your SMS inbox.", "success");
    } catch (err: any) {
      showToast(err.message, "error");
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
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden shadow-md mb-3">
            <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-tx-p tracking-tight">OTP Verification</h1>
          <p className="text-xs text-tx-s mt-1">Sent to Aadhaar-linked mobile +91 *****{mobile.slice(-4) || "1015"}</p>
        </div>

        <div className="bg-bg-p border border-bd-t rounded-xl p-6 sm:p-8 shadow-card">
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Input
                label="6-digit Verification OTP"
                type="text"
                placeholder="Enter 6-digit OTP code"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                floating={false}
                required
              />
            </div>

            <Button type="submit" className="w-full flex justify-center items-center gap-2" disabled={isLoading}>
              <IconLock className="w-4 h-4" /> {isLoading ? "Verifying..." : "Confirm & Authenticate"}
            </Button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-bd-t flex items-center justify-between text-xs text-tx-s">
            <span>Didn't receive code?</span>
            <button
              onClick={handleResend}
              disabled={timer > 0}
              className={`font-bold transition-all ${
                timer > 0 ? "text-tx-t cursor-not-allowed" : "text-primary hover:underline"
              }`}
            >
              {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
