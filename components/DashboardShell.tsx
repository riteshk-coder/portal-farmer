"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  IconBuildingStore,
  IconUserCheck,
  IconBuilding,
  IconCpu,
  IconLock,
} from "@tabler/icons-react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { PageTransition } from "@/components/PageTransition";

interface DashboardShellProps {
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  const router = useRouter();
  const { currentRole, activeTabs, setActiveTabForRole, logout, loginAsRole } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sessionUser, setSessionUser] = useState({
    name: "",
    email: "",
    position: ""
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setSessionUser({
        name: localStorage.getItem("user_name") || "",
        email: localStorage.getItem("user_email") || "",
        position: localStorage.getItem("user_position") || ""
      });
    }
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleDetails = (role: string | null) => {
    const defaultName = sessionUser.name || (role === "buyer" ? "R.K. Traders Pvt. Ltd" : role === "fpo" ? "Nashik Agro FPO" : "Platform governance");
    const defaultInitials = getInitials(defaultName);

    switch (role) {
      case "fpo":
        return {
          name: "FPO",
          shortName: "FPO",
          color: "text-teal-accent bg-teal-bg border-teal-m/20",
          icon: <IconBuildingStore className="w-4 h-4 text-teal-accent" />,
          tabs: ["Overview", "My lots", "Upload lot", "Buyer matches", "Quotes", "Contracts", "Payouts", "Disputes"],
          groups: [
            { title: "Supply", tabs: ["Overview", "My lots", "Upload lot"] },
            { title: "Trade", tabs: ["Buyer matches", "Quotes", "Contracts"] },
            { title: "Payments", tabs: ["Payouts"] },
            { title: "Support", tabs: ["Disputes"] },
          ],
          userName: defaultName,
          userEmail: sessionUser.email || "fpo@buyerportal.in",
          userPosition: sessionUser.position || "",
          avatarInitials: defaultInitials,
          avatarBg: "var(--teal-bg)",
          avatarText: "var(--teal)",
        };
      case "buyer":
        return {
          name: "Buyer",
          shortName: "Buyer",
          color: "text-amb bg-amb-bg border-amb-m/20",
          icon: <IconUserCheck className="w-4 h-4 text-amb" />,
          tabs: ["Overview", "Lot alerts", "My quotes", "Sign contracts", "Escrow", "Incoming goods", "Issue GRN", "Disputes"],
          groups: [
            { title: "Procurement", tabs: ["Overview", "Lot alerts", "My quotes"] },
            { title: "Trade", tabs: ["Sign contracts", "Escrow", "Incoming goods", "Issue GRN"] },
            { title: "Support", tabs: ["Disputes"] },
          ],
          userName: defaultName,
          userEmail: sessionUser.email || "buyer@buyerportal.in",
          userPosition: sessionUser.position || "",
          avatarInitials: defaultInitials,
          avatarBg: "var(--amb-bg)",
          avatarText: "var(--amb)",
        };
      case "mahafpc":
        return {
          name: "MahaFPC Admin",
          shortName: "MahaFPC",
          color: "text-gry-m bg-gry-bg border-gry-m/20",
          icon: <IconBuilding className="w-4 h-4 text-gry-m" />,
          tabs: ["Overview", "All transactions", "Reports", "Buyer scores", "FPO ratings", "Disputes", "Archive", "Roles & Permissions", "Member Directory", "Contact Inquiries"],
          groups: [
            { title: "Regulation", tabs: ["Overview", "All transactions", "Reports"] },
            { title: "Compliance", tabs: ["Buyer scores", "FPO ratings", "Disputes", "Archive"] },
            { title: "Admin", tabs: ["Roles & Permissions", "Member Directory", "Contact Inquiries"] },
          ],
          userName: defaultName,
          userEmail: sessionUser.email || "governance@mahafpc.in",
          userPosition: sessionUser.position || "",
          avatarInitials: defaultInitials,
          avatarBg: "var(--gry-bg)",
          avatarText: "var(--gry)",
        };
      case "portal":
        return {
          name: "Portal AI",
          shortName: "Portal AI",
          color: "text-pur bg-pur-bg border-pur-m/20",
          icon: <IconCpu className="w-4 h-4 text-pur" />,
          tabs: ["System status", "Matching queue", "Notifications", "Auto-generated", "eSign status"],
          groups: [
            { title: "Engine Status", tabs: ["System status", "Matching queue", "Notifications"] },
            { title: "Transaction Vault", tabs: ["Auto-generated", "eSign status"] },
          ],
          userName: "AI Daemon",
          userEmail: "portal@buyerportal.in",
          userPosition: "",
          avatarInitials: "AI",
          avatarBg: "var(--pur-bg)",
          avatarText: "var(--pur)",
        };
      case "escrow":
        return {
          name: "Escrow",
          shortName: "Escrow",
          color: "text-cor bg-cor-bg border-cor-m/20",
          icon: <IconLock className="w-4 h-4 text-cor" />,
          tabs: ["Overview", "Held funds", "Release queue", "Farmer splits", "Ledger"],
          groups: [
            { title: "Financials", tabs: ["Overview", "Held funds", "Release queue"] },
            { title: "Distributions", tabs: ["Farmer splits", "Ledger"] },
          ],
          userName: "Financial service layer",
          userEmail: "escrow@buyerportal.in",
          userPosition: "",
          avatarInitials: "ES",
          avatarBg: "var(--cor-bg)",
          avatarText: "var(--cor)",
        };
      default:
        return {
          name: "",
          shortName: "",
          color: "",
          icon: null,
          tabs: [],
          groups: [],
          userName: "",
          userEmail: "",
          userPosition: "",
          avatarInitials: "",
          avatarBg: "",
          avatarText: "",
        };
    }
  };

  const role = (currentRole || "fpo") as "fpo" | "buyer" | "mahafpc" | "portal" | "escrow";
  const details = getRoleDetails(role);
  const activeTab = activeTabs[role] || details.tabs[0];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleRoleSwitch = (targetRole: "fpo" | "buyer" | "mahafpc" | "portal" | "escrow") => {
    loginAsRole(targetRole);
    router.push(`/${targetRole}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-s">
      <Header
        role={role}
        roleDetails={details}
        onLogout={handleLogout}
        onRoleSwitch={handleRoleSwitch}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex-1 flex relative">
        <Sidebar
          groups={details.groups}
          tabs={details.tabs}
          activeTab={activeTab}
          roleName={details.name}
          onTabChange={(tab) => setActiveTabForRole(role, tab)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 lg:pl-sidebar bg-bg-s overflow-x-hidden min-h-[calc(100vh-var(--header-height))]">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
            <PageTransition key={activeTab}>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
};
