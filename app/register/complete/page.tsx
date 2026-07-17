"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { IconArrowLeft, IconLock, IconCheck } from "@tabler/icons-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg("Invalid or missing invitation token. Please check your email link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!token) {
      setErrorMsg("Invitation token is missing.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/auth/members/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to complete registration.");
      }

      setSuccessMsg(data.message || "Registration complete!");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-s flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={() => router.push("/auth")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors mb-6"
        >
          <IconArrowLeft className="w-4 h-4" /> Back to Login
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden shadow-md mb-3 bg-white">
            <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-tx-p tracking-tight">
            Complete Registration
          </h1>
          <p className="text-xs text-tx-s mt-1 font-semibold">Setup password for your organization member account</p>
        </div>

        {/* Card Container */}
        <div className="bg-bg-p border border-bd-t rounded-xl p-6 sm:p-8 shadow-card">
          {successMsg ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <IconCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-tx-p">Setup Successful</h3>
                <p className="text-xs text-tx-s mt-2 leading-relaxed font-semibold">
                  {successMsg}
                </p>
              </div>
              <Button onClick={() => router.push("/auth")} className="w-full mt-4">
                Return to Login
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-lg font-semibold border border-red-200/50 dark:border-red-950">
                  {errorMsg}
                </div>
              )}

              <Input
                label="Choose Password"
                type="password"
                placeholder="at least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                floating={false}
                required
                disabled={!token || isLoading}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="re-enter chosen password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                floating={false}
                required
                disabled={!token || isLoading}
              />

              <Button
                type="submit"
                className="w-full flex items-center justify-center gap-2"
                disabled={!token || isLoading}
              >
                <IconLock className="w-4 h-4" />
                {isLoading ? "Saving password..." : "Complete Registration"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
