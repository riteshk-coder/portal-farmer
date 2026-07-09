"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  extra,
  children,
  className = "",
  hover = true,
  padding = "md",
}) => {
  const paddingClass = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[padding];

  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: "var(--shadow-card-hover)" } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "bg-bg-p border border-bd-t rounded-lg shadow-card transition-shadow duration-200",
        paddingClass,
        className
      )}
    >
      {(title || subtitle || extra) && (
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-bd-t">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && (
              <p className="text-sm text-tx-s mt-1 font-normal">{subtitle}</p>
            )}
          </div>
          {extra && <div className="shrink-0 ml-4">{extra}</div>}
        </div>
      )}
      <div className="text-tx-s text-sm leading-relaxed">{children}</div>
    </motion.div>
  );
};
