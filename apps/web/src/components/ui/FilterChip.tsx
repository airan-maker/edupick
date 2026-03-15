"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function FilterChip({
  className,
  selected = false,
  children,
  ...props
}: FilterChipProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center px-3.5 py-2 text-sm rounded-full transition-colors whitespace-nowrap cursor-pointer shadow-[0_12px_24px_rgba(195,200,220,0.16)]",
        selected
          ? "bg-[linear-gradient(135deg,#81b7ff_0%,#6aa8ff_100%)] text-white"
          : "border border-white/70 bg-white/72 text-text-secondary backdrop-blur-md hover:bg-white hover:text-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
