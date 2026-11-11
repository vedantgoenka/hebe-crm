import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "@/components/crm/client-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("clients.manage");
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("*").eq("id", Number(id)).is("archived_at", null).maybeSingle();
  if (!client) notFound();
  return (
    <>
      <PageHead title={`Edit ${client.name}`} />
      <ClientForm client={client} />
    </>
  );
}
