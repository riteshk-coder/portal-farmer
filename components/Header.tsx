"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSearch,
  IconBell,
  IconLogout,
  IconChevronDown,
  IconBuildingStore,
  IconUserCheck,
  IconBuilding,
  IconCpu,
  IconLock,
  IconMenu2,
  IconX,
  IconSun,
  IconMoon,
  IconUser,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useApp, SystemLog } from "@/context/AppContext";

const formatRelativeTime = (timestampStr: string) => {
  if (!timestampStr) return "";
  try {
    const dateObj = new Date(timestampStr);
    if (isNaN(dateObj.getTime())) {
      return timestampStr;
    }
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch (e) {
    return timestampStr;
  }
};

type RoleType = "fpo" | "buyer" | "mahafpc" | "portal" | "escrow";

interface HeaderProps {
  role: RoleType;
  roleDetails: {
    name: string;
    shortName: string;
    color: string;
    icon: React.ReactNode;
    userName: string;
    avatarInitials: string;
    avatarBg: string;
    avatarText: string;
    userEmail?: string;
    userPosition?: string;
  };
  onLogout: () => void;
  onRoleSwitch: (role: RoleType) => void;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  roleDetails,
  onLogout,
  onRoleSwitch,
  onMenuToggle,
  sidebarOpen,
}) => {
  const { openModal, logs, currentRole, setActiveTabForRole, markAllLogsAsRead } = useApp();

  const handleNotificationClick = (l: SystemLog) => {
    setNotificationsOpen(false); // Close dropdown
    const msg = l.message.toLowerCase();
    const event = (l.eventType || "").toLowerCase();

    if (currentRole === "fpo") {
      if (event.includes("quote") || msg.includes("quote") || msg.includes("bid")) {
        setActiveTabForRole("fpo", "Quotes");
      } else if (event.includes("contract") || msg.includes("contract") || msg.includes("esign")) {
        setActiveTabForRole("fpo", "Contracts");
      } else if (event.includes("payment") || event.includes("payout") || event.includes("split") || event.includes("grn") || msg.includes("payout") || msg.includes("split") || msg.includes("paid") || msg.includes("grn") || msg.includes("fund")) {
        setActiveTabForRole("fpo", "Payouts");
      } else if (event.includes("dispute") || msg.includes("complaint") || msg.includes("dsp-")) {
        setActiveTabForRole("fpo", "Disputes");
      } else {
        setActiveTabForRole("fpo", "My lots");
      }
    } else if (currentRole === "buyer") {
      if (event.includes("match") || msg.includes("match") || msg.includes("buying preference")) {
        setActiveTabForRole("buyer", "Lot alerts");
      } else if (event.includes("quote") || msg.includes("quote") || msg.includes("bid") || msg.includes("counter")) {
        setActiveTabForRole("buyer", "My quotes");
      } else if (event.includes("contract") || msg.includes("contract") || msg.includes("esign") || msg.includes("signing")) {
        setActiveTabForRole("buyer", "Sign contracts");
      } else if (event.includes("escrow") || msg.includes("escrow") || msg.includes("deposit")) {
        setActiveTabForRole("buyer", "Escrow");
      } else if (event.includes("dispatch") || event.includes("tracking") || event.includes("delivery") || event.includes("grn") || msg.includes("grn") || msg.includes("arrived") || msg.includes("shipment") || msg.includes("dispatch")) {
        setActiveTabForRole("buyer", "Issue GRN");
      } else if (event.includes("dispute") || msg.includes("complaint") || msg.includes("dsp-")) {
        setActiveTabForRole("buyer", "Disputes");
      } else {
        setActiveTabForRole("buyer", "Lot alerts");
      }
    } else if (currentRole === "mahafpc") {
      if (event.includes("user") || event.includes("fpo_registered") || event.includes("buyer_registered") || event.includes("verification") || msg.includes("registration") || msg.includes("register") || msg.includes("verification") || msg.includes("team member")) {
        setActiveTabForRole("mahafpc", "Member Directory");
      } else if (event.includes("dispute") || msg.includes("complaint") || msg.includes("dispute") || msg.includes("resolution") || msg.includes("arbitration") || msg.includes("dsp-")) {
        setActiveTabForRole("mahafpc", "Disputes");
      } else {
        setActiveTabForRole("mahafpc", "Overview");
      }
    }
  };

  const sortedLogs = React.useMemo(() => {
    if (!logs) return [];
    return [...logs].sort((a, b) => {
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [logs]);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (notificationsOpen && logs && logs.some(l => !l.isRead)) {
      markAllLogsAsRead();
    }
  }, [notificationsOpen, logs]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const roles = [
    { id: "fpo" as RoleType, label: "FPO Dashboard", icon: <IconBuildingStore className="w-4 h-4" /> },
    { id: "buyer" as RoleType, label: "Buyer Dashboard", icon: <IconUserCheck className="w-4 h-4" /> },
    { id: "mahafpc" as RoleType, label: "MahaFPC Regulator", icon: <IconBuilding className="w-4 h-4" /> },
    { id: "portal" as RoleType, label: "Portal AI Engine", icon: <IconCpu className="w-4 h-4" /> },
    { id: "escrow" as RoleType, label: "Escrow Service", icon: <IconLock className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-header glass-panel border-b border-bd-t flex items-center justify-between px-4 lg:px-6 select-none shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-md text-tx-s hover:bg-bg-t hover:text-tx-p transition-colors"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <IconX className="w-5 h-5" /> : <IconMenu2 className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm">
              <img src="/logo.jpg" alt="Buyer Portal Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-base tracking-tight text-tx-p hidden sm:block">
              Buyer Portal
            </span>
          </div>
          <div className={cn("hidden sm:flex items-center gap-1.5 px-3 py-1 border rounded-full font-semibold text-xs", roleDetails.color)}>
            {roleDetails.icon}
            <span>{roleDetails.shortName}</span>
          </div>
        </div>
      </div>

      {/* Center - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-t" aria-hidden />
          <input
            type="search"
            placeholder="Search transactions, lots, contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-bg-s border border-bd-t rounded-md text-tx-p placeholder:text-tx-t focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">


        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-md text-tx-s hover:bg-bg-t hover:text-tx-p transition-colors"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-md text-tx-s hover:bg-bg-t hover:text-tx-p transition-colors"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            aria-haspopup="menu"
          >
            <IconBell className="w-5 h-5" />
            {logs && logs.some(l => !l.isRead) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-bg-p" aria-hidden />
            )}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-bg-p border border-bd-t rounded-lg shadow-lg py-1 z-50 max-h-[400px] overflow-y-auto"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-bd-t flex items-center justify-between">
                  <p className="text-sm font-semibold text-tx-p">System Logs & Notifications</p>
                  <span className="text-xs bg-bg-s text-tx-s px-2 py-0.5 rounded-full font-medium">
                    {logs ? logs.filter(l => !l.isRead).length : 0} unread
                  </span>
                </div>
                {!logs || logs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-tx-s text-sm">
                    No notifications or logs recorded.
                  </div>
                ) : (
                  <div className="divide-y divide-bd-t">
                    {sortedLogs.slice(0, 8).map((l, i) => (
                      <div
                        key={l.id || i}
                        onClick={() => handleNotificationClick(l)}
                        className={cn(
                          "px-4 py-3 hover:bg-bg-s transition-colors text-xs cursor-pointer select-none relative",
                          !l.isRead && "bg-teal-50/50 dark:bg-teal-950/20"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-tx-p uppercase tracking-wider text-[9px] bg-bg-t px-1.5 py-0.5 rounded">
                              {l.channel}
                            </span>
                            {!l.isRead && (
                              <span className="w-1.5 h-1.5 bg-danger rounded-full" />
                            )}
                          </div>
                          <span className="text-tx-s">{formatRelativeTime(l.timestamp)}</span>
                        </div>
                        <p className={cn(
                          "text-tx-s leading-relaxed mt-1 hover:text-primary transition-colors",
                          !l.isRead ? "font-semibold text-tx-p" : "font-medium text-tx-s"
                        )}>{l.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-bg-t transition-colors"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="text-sm font-medium text-tx-s hidden lg:block max-w-[140px] truncate">
              {roleDetails.userName}
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-bd-t"
              style={{ backgroundColor: roleDetails.avatarBg, color: roleDetails.avatarText }}
            >
              {roleDetails.avatarInitials}
            </div>
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-bg-p border border-bd-t rounded-lg shadow-lg py-1 z-50"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-bd-t">
                  <p className="text-sm font-semibold text-tx-p truncate">{roleDetails.userName}</p>
                  <p className="text-xs text-tx-s mt-0.5">{roleDetails.userEmail || roleDetails.name}</p>
                  {roleDetails.userPosition && (
                    <span className="inline-flex text-[9px] font-bold text-primary bg-bg-t px-1.5 py-0.5 rounded tracking-wide uppercase mt-1">
                      {roleDetails.userPosition}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    openModal("user-profile");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-bg-s flex items-center gap-2 text-sm text-tx-p font-medium transition-colors border-b border-bd-t"
                  role="menuitem"
                >
                  <IconUser className="w-4 h-4 text-tx-s" />
                  My Profile
                </button>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2.5 hover:bg-bg-s flex items-center gap-2 text-sm text-cor font-medium transition-colors"
                  role="menuitem"
                >
                  <IconLogout className="w-4 h-4" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
