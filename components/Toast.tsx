"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { IconCheck, IconAlertCircle, IconInfoCircle, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface ToastItemProps {
  id: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const styles = {
    success: { bg: "bg-teal-bg text-teal-accent border-teal-m/20", icon: <IconCheck className="w-4 h-4" /> },
    warning: { bg: "bg-amb-bg text-amb border-amb-m/20", icon: <IconAlertCircle className="w-4 h-4" /> },
    error: { bg: "bg-cor-bg text-cor border-cor-m/20", icon: <IconAlertCircle className="w-4 h-4" /> },
    info: { bg: "bg-blu-bg text-blu-accent border-blu-accent/20", icon: <IconInfoCircle className="w-4 h-4" /> },
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg", styles.bg)}
      style={{ pointerEvents: "auto" }}
      role="alert"
    >
      <div className="shrink-0">{styles.icon}</div>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="shrink-0 p-1 text-tx-t hover:text-tx-p rounded-md hover:bg-black/5 transition-colors"
        aria-label="Close notification"
      >
        <IconX className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} message={t.message} type={t.type} onClose={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
