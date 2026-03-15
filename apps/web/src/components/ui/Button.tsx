"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "kakao";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] text-white shadow-[0_18px_34px_rgba(106,168,255,0.32)] hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(106,168,255,0.38)]",
  secondary:
    "rounded-full bg-[linear-gradient(135deg,#82d89d_0%,#68c588_100%)] text-white shadow-[0_18px_34px_rgba(104,197,136,0.26)] hover:-translate-y-0.5",
  outline:
    "rounded-full border border-white/70 bg-white/80 text-text-primary shadow-[0_12px_24px_rgba(193,199,221,0.22)] backdrop-blur-md hover:-translate-y-0.5 hover:bg-white",
  ghost:
    "rounded-full bg-white/40 text-text-primary hover:bg-white/72",
  kakao:
    "rounded-full bg-kakao text-kakao-text hover:-translate-y-0.5 hover:bg-kakao/90 font-medium shadow-[0_16px_30px_rgba(254,229,0,0.26)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-4.5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
