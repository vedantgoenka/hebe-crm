import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "@/components/crm/company-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Add company" };

export default async function NewCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("clients.manage");
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name").eq("id", Number(id)).is("archived_at", null).maybeSingle();
  if (!client) notFound();
  return (
    <>
      <PageHead title="Add company" sub={<>For client <Link href={`/clients/${client.id}`}>{client.name}</Link></>} />
      <CompanyForm clientId={client.id} />
    </>
  );
}
