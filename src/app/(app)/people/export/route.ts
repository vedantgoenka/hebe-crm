import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PERSON_ROLES, label } from "@/lib/options";
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
    .from("people")
    .select("full_name, phone, email, companies:company_people(role, is_primary, archived_at, company:companies(name, archived_at))")
    .is("archived_at", null)
    .order("full_name");
  if (error) return new NextResponse("Export failed", { status: 500 });

  const header = ["Name", "Phone", "Email", "Companies"];
  const rows = (data ?? []).map((p) => {
    const companies = (p.companies as unknown as { role: string; is_primary: boolean; archived_at: string | null; company: { name: string; archived_at: string | null } }[])
      .filter((c) => !c.archived_at && !c.company.archived_at)
      .map((c) => `${c.company.name} (${label(PERSON_ROLES, c.role)}${c.is_primary ? ", primary" : ""})`)
      .join("; ");
    return [p.full_name, p.phone, p.email, companies];
  });

  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hebe-contacts-${todayIST()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
