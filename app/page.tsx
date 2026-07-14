"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/auth");
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-s flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <span className="text-tx-s text-xs font-semibold uppercase tracking-wider">Loading auth portal...</span>
      </div>
    </div>
  );
}
