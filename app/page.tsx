"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  IconBuildingStore,
  IconUserCheck,
  IconBuilding,
  IconCpu,
  IconLock,
  IconLeaf,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type RoleType = "fpo" | "buyer" | "mahafpc" | "portal" | "escrow";

export default function LoginPage() {
  const router = useRouter();
  const { loginAsRole, showToast } = useApp();
  const [selectedRole, setSelectedRole] = useState<RoleType>("fpo");

  const roles = [
    {
      id: "fpo" as RoleType,
      title: "FPO",
      subtitle: "Farmer Producer Org.",
      icon: IconBuildingStore,
      accent: "border-primary bg-teal-bg/60",
      activeRing: "ring-primary/30",
    },
    {
      id: "buyer" as RoleType,
      title: "Buyer",
      subtitle: "Verified trader",
      icon: IconUserCheck,
      accent: "border-warning bg-warning-bg/60",
      activeRing: "ring-warning/30",
    },
    {
      id: "mahafpc" as RoleType,
      title: "MahaFPC",
      subtitle: "Admin / Regulator",
      icon: IconBuilding,
      accent: "border-pur bg-pur-bg/60",
      activeRing: "ring-pur/30",
    },
    {
      id: "portal" as RoleType,
      title: "Portal AI",
      subtitle: "System actor",
      icon: IconCpu,
      accent: "border-info bg-info-bg/60",
      activeRing: "ring-info/30",
    },
    {
      id: "escrow" as RoleType,
      title: "Escrow",
      subtitle: "Financial service layer",
      icon: IconLock,
      accent: "border-gry-m bg-gry-bg/60",
      activeRing: "ring-gry-m/30",
      gridSpan: "sm:col-span-2",
    },
  ];

  const handleSignIn = () => {
    loginAsRole(selectedRole);
    showToast(`Logged in successfully as ${selectedRole.toUpperCase()}`, "success");
    router.push(`/${selectedRole}`);
  };

  const activeRoleName = roles.find((r) => r.id === selectedRole)?.title || "";

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
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl btn-gradient shadow-lg mb-4">
            <IconLeaf className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs font-semibold tracking-widest text-tx-s uppercase">
            Digital Buyer Access Portal
          </p>
          <h1 className="text-2xl font-bold text-tx-p mt-2 tracking-tight">
            Agri-Commodity Platform
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-bg-p border border-bd-t rounded-xl p-6 sm:p-8 shadow-card">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-tx-p">Sign in</h2>
            <p className="text-sm text-tx-s mt-1">Select your role to continue</p>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {roles.map((role) => {
              const active = selectedRole === role.id;
              const Icon = role.icon;
              return (
                <motion.button
                  key={role.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole(role.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left flex items-start gap-3 transition-all duration-200",
                    role.gridSpan,
                    active
                      ? `${role.accent} ring-2 ${role.activeRing} shadow-sm`
                      : "bg-bg-s/50 border-bd-t hover:bg-bg-t hover:border-bd-s"
                  )}
                  aria-pressed={active}
                >
                  <div className={cn("mt-0.5", active ? "text-tx-p" : "text-tx-t")}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-tx-p">{role.title}</div>
                    <div className="text-xs text-tx-s mt-0.5">{role.subtitle}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="border-t border-bd-t my-6" />

          <div className="space-y-4 mb-6">
            <Input label="Organization Email" type="email" value="demo@portal.in" disabled floating={false} />
            <Input label="Password" type="password" value="demo1234" disabled floating={false} />
          </div>

          <Button onClick={handleSignIn} className="w-full" size="lg">
            Sign in as {activeRoleName} →
          </Button>
        </div>

        <p className="text-center text-xs text-tx-t mt-6">
          Demo environment · No real authentication required
        </p>
      </motion.div>
    </div>
  );
}
