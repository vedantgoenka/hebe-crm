import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { archiveCompany } from "@/lib/actions/clients";
import { ActionForm, Submit } from "@/components/form";
import { CompanyForm } from "@/components/crm/company-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Edit company" };

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requirePermission("clients.manage");
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies").select("*, client:clients(id, name)").eq("id", Number(id)).is("archived_at", null).maybeSingle();
  if (!company) notFound();
  const client = company.client as { id: number; name: string };

  return (
    <>
      <PageHead title={`Edit ${company.name}`} sub={<>For client <Link href={`/clients/${client.id}`}>{client.name}</Link></>} />
      <CompanyForm clientId={client.id} company={company} />
      {staff.can("data.delete") && (
        <ActionForm action={archiveCompany.bind(null, client.id, company.id)} confirm="Archive this company? It will disappear from lists but stay in the database." className="mt-4">
          <Submit variant="danger" small>Archive company</Submit>
        </ActionForm>
      )}
    </>
  );
}
