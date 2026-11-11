import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger" | "quiet";

const styles: Record<Variant, string> = {
  primary: "bg-ledger text-white border-ledger hover:bg-ledger-deep hover:text-white",
  secondary: "bg-white text-ledger border-ledger hover:bg-[#f2f6f4]",
  danger: "bg-white text-alert border-alert hover:bg-alert-soft",
  quiet: "bg-transparent text-ink border-transparent underline px-0",
};

export function buttonClass(variant: Variant = "primary", small = false) {
  return [
    "inline-flex items-center gap-2 rounded border font-semibold no-underline hover:no-underline cursor-pointer disabled:opacity-60 disabled:cursor-wait",
    small ? "px-2.5 py-1 text-sm" : "px-4 py-2",
    styles[variant],
  ].join(" ");
}

export function Button({ variant = "primary", small, className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; small?: boolean }) {
  return <button className={`${buttonClass(variant, small)} ${className}`} {...props} />;
}

export function LinkButton({ variant = "primary", small, className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant; small?: boolean }) {
  return <Link className={`${buttonClass(variant, small)} ${className}`} {...props} />;
}
