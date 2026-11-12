import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PersonEditForm } from "@/components/crm/person-form";
import { Notice, PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Edit person" };

export default async function EditPersonPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  await requirePermission("clients.manage");
  const supabase = await createClient();
  const { data: person } = await supabase.from("people").select("*").eq("id", Number(id)).is("archived_at", null).maybeSingle();
  if (!person) notFound();

  return (
    <>
      {saved && <Notice>Person saved.</Notice>}
      <PageHead title={`Edit ${person.full_name}`} />
      <PersonEditForm person={person} />
    </>
  );
}
