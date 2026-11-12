import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/crm/project-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("projects.manage");
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("id", Number(id)).is("archived_at", null).maybeSingle();
  if (!project) notFound();

  return (
    <>
      <PageHead title={`Edit ${project.title}`} />
      <ProjectForm companyId={project.company_id} project={project} />
    </>
  );
}
