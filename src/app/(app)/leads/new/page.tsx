import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { LeadForm } from "@/components/crm/lead-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Add lead" };

export default async function NewLeadPage() {
  const staff = await requirePermission("leads.manage");
  return (
    <>
      <PageHead title="Add lead" />
      <LeadForm me={staff.id} />
    </>
  );
}
