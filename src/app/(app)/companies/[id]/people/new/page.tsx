import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchTerm } from "@/lib/data";
import { linkPersonToCompany } from "@/lib/actions/contacts";
import { ActionForm, Submit } from "@/components/form";
import { PageHead } from "@/components/page-head";
import { PersonForm } from "@/components/crm/person-form";

export const metadata: Metadata = { title: "Add person" };

export default async function NewPersonPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  await requirePermission("clients.manage");
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("id, name, client:clients(full_name:name, phone, email)").eq("id", Number(id)).is("archived_at", null).maybeSingle();
  if (!company) notFound();
  const client = company.client as unknown as { full_name: string; phone: string | null; email: string | null };

  const { count: linkedCount } = await supabase
    .from("company_people")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id)
    .is("archived_at", null);

  const term = searchTerm(q);
  const { data: matches } = term
    ? await supabase
        .from("people")
        .select("id, full_name, phone, email, companies:company_people(company:companies(name))")
        .is("archived_at", null)
        .or(`full_name.ilike.${term},phone.ilike.${term}`)
        .limit(20)
    : { data: null };

  return (
    <>
      <PageHead title={`Add person for ${company.name}`} />

      <form className="mb-5 flex flex-wrap items-center gap-3 panel" action={`/companies/${company.id}/people/new`}>
        <input type="search" name="q" defaultValue={q} placeholder="Search existing people by name or phone" aria-label="Search people" className="input max-w-72" />
        <button className="cursor-pointer rounded border border-ledger bg-white px-4 py-2 font-semibold text-ledger" type="submit">Search</button>
      </form>

      {term && (
        <section className="panel mb-5">
          <h2 className="mb-3 text-lg font-semibold">Existing people</h2>
          {!matches?.length ? (
            <p className="text-muted">No matches. Add a new person below.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {matches.map((p) => {
                const companies = (p.companies as unknown as { company: { name: string } }[]) ?? [];
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <div>{p.full_name}</div>
                      <div className="text-sm text-muted">
                        {[p.phone, p.email].filter(Boolean).join(", ") || "—"}
                        {companies.length > 0 && <> · also at {companies.map((c) => c.company.name).join(", ")}</>}
                      </div>
                    </div>
                    <ActionForm action={linkPersonToCompany.bind(null, company.id, p.id)}>
                      <Submit variant="secondary" small>Link to this company</Submit>
                    </ActionForm>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Add a new person</h2>
        <PersonForm companyId={company.id} prefill={!linkedCount ? client : undefined} />
      </section>
    </>
  );
}
