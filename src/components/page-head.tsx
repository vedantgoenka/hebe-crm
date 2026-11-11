import type { ReactNode } from "react";

export function PageHead({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight">{title}</h1>
        {sub && <div className="mt-1 text-muted">{sub}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "alert"; children: ReactNode }) {
  const cls = tone === "ok" ? "border-[#b7dcc7] bg-ok-soft" : "border-[#f1b8b1] bg-alert-soft";
  return <div role={tone === "alert" ? "alert" : "status"} className={`mb-5 rounded border px-4 py-3 ${cls}`}>{children}</div>;
}
