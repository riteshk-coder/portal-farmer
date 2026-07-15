"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  IconBuildingStore,
  IconUserCheck,
  IconBuilding,
  IconUserCircle,
  IconLeaf,
} from "@tabler/icons-react";
import { roleConfig } from "@/lib/auth/roleConfig";
import { cn } from "@/lib/utils";

export default function AuthLandingPage() {
  const router = useRouter();

  const roles = [
    {
      id: "buyer",
      icon: IconUserCheck,
      color: "border-warning bg-warning-bg/60 text-warning",
      activeRing: "ring-warning/30",
    },
    {
      id: "fpo",
      icon: IconBuildingStore,
      color: "border-primary bg-teal-bg/60 text-primary",
      activeRing: "ring-primary/30",
    },
    {
      id: "admin",
      icon: IconBuilding,
      color: "border-pur bg-pur-bg/60 text-pur",
      activeRing: "ring-pur/30",
    },
    {
      id: "consultant",
      icon: IconUserCircle,
      color: "border-info bg-info-bg/60 text-info",
      activeRing: "ring-info/30",
    },
  ];

  return (
    <div className="min-h-screen bg-bg-s flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-bg/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-info-bg/30 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl"
      >
        {/* Brand header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-lg mb-4">
            <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs font-semibold tracking-widest text-tx-s uppercase">
            Buyer Portal
          </p>
          <h1 className="text-3xl font-bold text-tx-p mt-2 tracking-tight">
            Select Your Role to Continue
          </h1>
          <p className="text-sm text-tx-s mt-2">
            Choose your platform access type to register or log in
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {roles.map((r) => {
            const config = roleConfig[r.id];
            const Icon = r.icon;
            return (
              <motion.button
                key={r.id}
                type="button"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/login/${r.id}`)}
                className={cn(
                  "p-6 rounded-xl border-2 text-left flex items-start gap-4 transition-all duration-200 bg-bg-p border-bd-t hover:border-bd-s shadow-sm hover:shadow-md"
                )}
              >
                <div className={cn("p-3 rounded-lg border", r.color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-tx-p">{config.label}</h3>
                  <p className="text-xs text-tx-s mt-1.5 leading-relaxed">
                    {config.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-tx-p hover:text-primary transition-colors mt-4">
                    Sign in or Register &rarr;
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
