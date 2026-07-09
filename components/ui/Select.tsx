"use client";

import React, { useId } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-tx-s mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full h-11 px-4 pr-10 text-sm font-medium text-tx-p appearance-none",
              "bg-bg-p border-2 border-bd-t rounded-md",
              "transition-all duration-200 cursor-pointer",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              error && "border-danger",
              className
            )}
            aria-invalid={!!error}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <IconChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-t pointer-events-none"
            aria-hidden
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-danger font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

interface FileUploadProps {
  label?: string;
  accept?: string;
  onChange?: (file: File | null) => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = "Upload file",
  accept,
  onChange,
  className,
}) => {
  const [dragOver, setDragOver] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    setFileName(file?.name || null);
    onChange?.(file);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <p className="block text-sm font-medium text-tx-s mb-1.5">{label}</p>
      )}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-8",
          "border-2 border-dashed rounded-lg cursor-pointer",
          "transition-all duration-200",
          dragOver
            ? "border-primary bg-teal-bg/50"
            : "border-bd-t hover:border-primary hover:bg-bg-t"
        )}
        aria-label={label}
      >
        <div className="w-10 h-10 rounded-full bg-teal-bg flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-tx-p">
            {fileName || "Drop files here or click to browse"}
          </p>
          <p className="text-xs text-tx-t mt-1">PDF, JPG, PNG up to 10MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>
    </div>
  );
};
