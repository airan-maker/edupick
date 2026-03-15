"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export function useProtectedPage() {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    mounted,
    isAuthenticated,
    canUseProtectedApi: mounted && isAuthenticated,
  };
}
