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
import { useApp } from "@/context/AppContext";

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
  const { openModal } = useApp();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
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
            <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <span className="font-bold text-base tracking-tight text-tx-p hidden sm:block">
              DBAP
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
        {/* Quick Switch */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-tx-s bg-bg-s border border-bd-t rounded-md hover:bg-bg-t hover:text-tx-p transition-all"
            aria-expanded={switcherOpen}
            aria-haspopup="listbox"
          >
            <span>Quick Switch</span>
            <IconChevronDown className={cn("w-3.5 h-3.5 transition-transform", switcherOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} aria-hidden />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-52 bg-bg-p border border-bd-t rounded-lg shadow-lg py-1 z-50"
                  role="listbox"
                >
                  <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-tx-t font-semibold border-b border-bd-t">
                    Select Actor View
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      role="option"
                      aria-selected={role === r.id}
                      onClick={() => {
                        onRoleSwitch(r.id);
                        setSwitcherOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-bg-s flex items-center gap-2.5 transition-colors text-sm",
                        role === r.id ? "text-tx-p bg-bg-s font-semibold" : "text-tx-s"
                      )}
                    >
                      {r.icon}
                      <span>{r.label}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-md text-tx-s hover:bg-bg-t hover:text-tx-p transition-colors"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-md text-tx-s hover:bg-bg-t hover:text-tx-p transition-colors"
          aria-label="Notifications"
        >
          <IconBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-bg-p" aria-hidden />
        </button>

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
                  <p className="text-xs text-tx-s mt-0.5">{roleDetails.name}</p>
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
