"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconLayoutDashboard,
  IconPackage,
  IconUpload,
  IconFileText,
  IconBell,
  IconSignature,
  IconShieldLock,
  IconTruck,
  IconReceipt,
  IconExchange,
  IconChartBar,
  IconAward,
  IconAlertTriangle,
  IconArchive,
  IconActivity,
  IconCpu,
  IconChecks,
  IconArrowUpRight,
  IconUsers,
  IconBook,
  IconNotification,
  IconWallet,
  IconShield,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const getTabIcon = (tabName: string) => {
  const t = tabName.toLowerCase();
  if (t.includes("overview")) return <IconLayoutDashboard className="w-5 h-5" />;
  if (t.includes("roles & permissions") || t.includes("roles")) return <IconShield className="w-5 h-5" />;
  if (t.includes("my lots") || t.includes("all lots")) return <IconPackage className="w-5 h-5" />;
  if (t.includes("upload")) return <IconUpload className="w-5 h-5" />;
  if (t.includes("matches")) return <IconUsers className="w-5 h-5" />;
  if (t.includes("quotes") || t.includes("my quotes")) return <IconReceipt className="w-5 h-5" />;
  if (t.includes("contracts") || t.includes("auto-generated")) return <IconFileText className="w-5 h-5" />;
  if (t.includes("payouts") || t.includes("splits")) return <IconWallet className="w-5 h-5" />;
  if (t.includes("alerts")) return <IconBell className="w-5 h-5" />;
  if (t.includes("sign")) return <IconSignature className="w-5 h-5" />;
  if (t.includes("escrow") || t.includes("held")) return <IconShieldLock className="w-5 h-5" />;
  if (t.includes("incoming") || t.includes("transit")) return <IconTruck className="w-5 h-5" />;
  if (t.includes("grn")) return <IconReceipt className="w-5 h-5" />;
  if (t.includes("transaction")) return <IconExchange className="w-5 h-5" />;
  if (t.includes("reports")) return <IconChartBar className="w-5 h-5" />;
  if (t.includes("scores") || t.includes("ratings")) return <IconAward className="w-5 h-5" />;
  if (t.includes("dispute")) return <IconAlertTriangle className="w-5 h-5" />;
  if (t.includes("archive")) return <IconArchive className="w-5 h-5" />;
  if (t.includes("status")) return <IconActivity className="w-5 h-5" />;
  if (t.includes("queue")) return <IconCpu className="w-5 h-5" />;
  if (t.includes("notification")) return <IconNotification className="w-5 h-5" />;
  if (t.includes("esign status")) return <IconChecks className="w-5 h-5" />;
  if (t.includes("release")) return <IconArrowUpRight className="w-5 h-5" />;
  if (t.includes("farmer") || t.includes("directory") || t.includes("member")) return <IconUsers className="w-5 h-5" />;
  if (t.includes("ledger")) return <IconBook className="w-5 h-5" />;
  return <IconPackage className="w-5 h-5" />;
};

interface SidebarGroup {
  title: string;
  tabs: string[];
}

interface SidebarProps {
  groups: SidebarGroup[];
  tabs: string[];
  activeTab: string;
  roleName: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  groups,
  tabs,
  activeTab,
  roleName,
  onTabChange,
  isOpen,
  onClose,
}) => {
  const renderTab = (tab: string) => {
    const active = activeTab === tab;
    return (
      <button
        key={tab}
        onClick={() => {
          onTabChange(tab);
          onClose();
        }}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all text-left relative group",
          active
            ? "bg-teal-bg text-primary font-semibold"
            : "text-tx-s hover:bg-bg-t hover:text-tx-p"
        )}
        aria-current={active ? "page" : undefined}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className={cn("shrink-0 transition-colors", active ? "text-primary" : "text-tx-t group-hover:text-tx-s")}>
          {getTabIcon(tab)}
        </span>
        <span className="truncate">{tab}</span>
      </button>
    );
  };

  const sidebarContent = (
    <>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
        {groups && groups.length > 0 ? (
          groups.map((group) => (
            <div key={group.title} className="space-y-1 pt-4 first:pt-0">
              <div className="px-3 py-1.5 text-[10px] font-bold text-tx-t uppercase tracking-widest select-none">
                {group.title}
              </div>
              {group.tabs.map(renderTab)}
            </div>
          ))
        ) : (
          tabs.map(renderTab)
        )}
      </div>

      <div className="p-4 border-t border-bd-t bg-bg-s/50">
        <p className="text-[10px] text-tx-t font-medium uppercase tracking-wider">Logged in as</p>
        <p className="text-sm text-tx-p font-semibold mt-1 truncate">{roleName}</p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-sidebar bg-sidebar border-r border-bd-t flex-col fixed top-header bottom-0 select-none z-30"
        aria-label="Main navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-tx-p/40 backdrop-blur-sm z-40"
              onClick={onClose}
              aria-hidden
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="lg:hidden fixed top-header left-0 bottom-0 w-[280px] bg-sidebar border-r border-bd-t flex flex-col z-50 shadow-lg"
              aria-label="Mobile navigation"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
