import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/crm/project-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Add project" };

export default async function NewProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("projects.manage");
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("id, name").eq("id", Number(id)).is("archived_at", null).maybeSingle();
  if (!company) notFound();

  return (
    <>
      <PageHead title={`Add project for ${company.name}`} />
      <ProjectForm companyId={company.id} />
    </>
  );
}
