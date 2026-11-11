import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadForm } from "@/components/crm/lead-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Edit lead" };

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requirePermission("leads.manage");
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", Number(id)).is("archived_at", null).maybeSingle();
  if (!lead) notFound();

  return (
    <>
      <PageHead title={`Edit ${lead.name}`} />
      <LeadForm lead={lead} me={staff.id} />
    </>
  );
}
