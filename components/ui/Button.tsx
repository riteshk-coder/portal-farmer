"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "btn-gradient text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "border-2 border-bd-t bg-bg-p text-tx-p hover:bg-bg-t hover:border-bd-s",
        danger:
          "bg-danger text-white shadow-md hover:bg-cor-m hover:shadow-lg hover:-translate-y-0.5",
        ghost:
          "text-tx-s hover:bg-bg-t hover:text-tx-p",
        outline:
          "border-2 border-primary text-primary bg-transparent hover:bg-teal-bg",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-3 text-xs rounded-md",
        md: "h-11 px-5 text-sm rounded-md",
        lg: "h-[44px] px-6 text-sm rounded-md",
        icon: "h-11 w-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
