"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gry-bg text-gry border-gry-m/30",
        success: "bg-teal-bg text-teal-accent border-teal-m/30",
        warning: "bg-amb-bg text-amb border-amb-m/30",
        danger: "bg-cor-bg text-cor border-cor-m/30",
        info: "bg-blu-bg text-blu-accent border-blu-accent/20",
        purple: "bg-pur-bg text-pur border-pur-m/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
};

export function getStatusVariant(status: string): VariantProps<typeof badgeVariants>["variant"] {
  const s = status.toLowerCase();

  if (
    ["matched", "signed", "released", "paid", "resolved", "grn issued", "complete", "deposited", "active", "operational", "protected"].includes(s)
  ) {
    return "success";
  }

  if (
    ["quoting", "pending", "awaiting response", "negotiating", "esign pending", "pending deposit", "review"].includes(s)
  ) {
    return "warning";
  }

  if (["counter-offer", "rejected"].includes(s)) {
    return "danger";
  }

  if (["dispatched", "in-transit", "delivered"].includes(s)) {
    return "purple";
  }

  if (["pending match", "draft"].includes(s)) {
    return "info";
  }

  return "default";
}

interface PillProps {
  status: string;
}

/** Backward-compatible status pill — maps status strings to Badge variants */
export const Pill: React.FC<PillProps> = ({ status }) => {
  return (
    <Badge variant={getStatusVariant(status)}>
      {status}
    </Badge>
  );
};

export { badgeVariants };
