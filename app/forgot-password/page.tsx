"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { IconLeaf, IconLockSquare, IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const router = useRouter();

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
        className="relative z-10 w-full max-w-md text-center"
      >
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden shadow-md mb-3">
            <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-tx-p tracking-tight">Forgot Password?</h1>
        </div>

        <div className="bg-bg-p border border-bd-t rounded-xl p-6 sm:p-8 shadow-card text-left space-y-5">
          <div className="flex justify-center text-tx-t">
            <IconLockSquare className="w-16 h-16 text-primary/80" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-sm font-bold text-tx-p">Passwordless Platform</h3>
            <p className="text-xs text-tx-s leading-relaxed">
              MahaFPC Contract Vault uses passwordless authentication exclusively. No traditional passwords are collected or stored.
            </p>
          </div>

          <div className="p-3 bg-bg-s rounded border border-bd-t text-xs text-tx-s leading-normal">
            To sign in securely, please use <strong>Sign-In with Google</strong> or <strong>Mobile OTP</strong> verification on your role's login page.
          </div>

          <Button onClick={() => router.push("/auth")} className="w-full flex justify-center items-center gap-2">
            <IconArrowLeft className="w-4 h-4" /> Return to Authentication
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
