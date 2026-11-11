import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LEAD_SOURCES, label } from "@/lib/options";
import { todayIST } from "@/lib/format";

function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const staff = await getStaff();
  if (!staff.can("data.export")) return new NextResponse("Not allowed", { status: 403 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("name, phone, email, city, state, is_outside_bihar, source, referred_by, owner:profiles!clients_relationship_owner_fkey(full_name), companies(name, archived_at)")
    .is("archived_at", null)
    .order("name");
  if (error) return new NextResponse("Export failed", { status: 500 });

  const header = ["Client", "Phone", "Email", "City", "State", "Outside Bihar", "Source", "Referred by", "Companies", "Relationship owner"];
  const rows = (data ?? []).map((c) => {
    const companies = (c.companies as { name: string; archived_at: string | null }[]).filter((x) => !x.archived_at).map((x) => x.name).join("; ");
    const owner = (c.owner as unknown as { full_name: string } | null)?.full_name;
    return [c.name, c.phone, c.email, c.city, c.state, c.is_outside_bihar ? "Yes" : "No", label(LEAD_SOURCES, c.source, ""), c.referred_by, companies, owner];
  });

  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hebe-clients-${todayIST()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
