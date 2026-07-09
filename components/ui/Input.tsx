"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  floating?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, floating = true, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    if (floating && label) {
      return (
        <div className="relative w-full">
          <input
            ref={ref}
            id={inputId}
            placeholder=" "
            className={cn(
              "peer w-full h-11 px-4 pt-4 pb-1 text-sm font-medium text-tx-p",
              "bg-bg-p border-2 border-bd-t rounded-md",
              "transition-all duration-200",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-bg-t",
              error && "border-danger focus:border-danger focus:ring-danger/20",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute left-4 top-3 text-sm text-tx-s font-medium transition-all duration-200 pointer-events-none",
              "peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary",
              "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs"
            )}
          >
            {label}
          </label>
          {error && (
            <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger font-medium" role="alert">
              {error}
            </p>
          )}
          {hint && !error && (
            <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-tx-t">
              {hint}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-tx-s mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-11 px-4 text-sm font-medium text-tx-p",
            "bg-bg-p border-2 border-bd-t rounded-md",
            "transition-all duration-200",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-bg-t",
            "placeholder:text-tx-t",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-danger font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-tx-s mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 text-sm font-medium text-tx-p",
            "bg-bg-p border-2 border-bd-t rounded-md resize-none",
            "transition-all duration-200",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            "placeholder:text-tx-t",
            error && "border-danger",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-danger font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
