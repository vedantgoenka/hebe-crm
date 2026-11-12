const IST = "Asia/Kolkata";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: IST });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: IST,
  });
}

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: IST });
}

export function nowLocalInputIST(): string {
  const d = new Date();
  const date = d.toLocaleDateString("en-CA", { timeZone: IST });
  const time = d.toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit" });
  return `${date}T${time}`;
}

export function isOverdue(date: string | null | undefined): boolean {
  return Boolean(date) && (date as string) < todayIST();
}

export function greeting(): string {
  const hour = Number(new Date().toLocaleString("en-GB", { timeZone: IST, hour: "2-digit", hour12: false }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** Indian currency in lakh/crore style, e.g. ₹12,50,000 or ₹1.25 Cr. */
export function formatINR(amountInRupees: number): string {
  const abs = Math.abs(amountInRupees);
  const sign = amountInRupees < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)} Lakh`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}
