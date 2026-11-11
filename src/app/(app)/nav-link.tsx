"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const on = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`block border-l-[3px] px-5 py-2 no-underline hover:bg-white/5 hover:text-white hover:no-underline ${
        on ? "border-brass bg-black/20 font-semibold text-white" : "border-transparent text-[#dce6e0]"
      }`}
    >
      {children}
    </Link>
  );
}
