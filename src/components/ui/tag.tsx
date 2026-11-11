import type { ReactNode } from "react";

const tones = {
  plain: "bg-mist text-ink",
  brass: "bg-brass-soft text-[#6e4f10]",
  ok: "bg-ok-soft text-ok",
  alert: "bg-alert-soft text-alert",
} as const;

export function Tag({ tone = "plain", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
