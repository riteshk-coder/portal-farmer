"use client";

import React from "react";
import { motion } from "framer-motion";
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  iconBg?: string;
  className?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  sub,
  trend = "neutral",
  trendValue,
  icon,
  accentColor = "#0F766E",
  iconBg = "#CCFBF1",
  className,
  onClick,
}) => {
  const TrendIcon =
    trend === "up" ? IconTrendingUp : trend === "down" ? IconTrendingDown : IconMinus;

  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-danger"
        : "text-tx-t";

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -4, boxShadow: "var(--shadow-card-hover)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "bg-bg-p border border-bd-t rounded-lg p-5 shadow-card transition-shadow duration-200",
        onClick && "cursor-pointer hover:border-primary/40 select-none",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-tx-s uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-tx-p mt-2 leading-none tracking-tight">
            {value}
          </p>
          {(sub || trendValue) && (
            <div className="flex items-center gap-2 mt-3">
              {trendValue && (
                <span className={cn("flex items-center gap-0.5 text-xs font-semibold", trendColor)}>
                  <TrendIcon className="w-3.5 h-3.5" aria-hidden />
                  {trendValue}
                </span>
              )}
              {sub && (
                <span className="text-xs text-tx-t font-medium truncate">{sub}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: iconBg, color: accentColor }}
            aria-hidden
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
};
