import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { unlinkPersonFromCompany, setPrimaryContact } from "@/lib/actions/contacts";
import { CONSTITUTIONS, PERSON_ROLES, label } from "@/lib/options";
import { ActionForm, Submit } from "@/components/form";
import { LinkButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Notice, PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Company" };

export default async function CompanyPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ person?: string; archived?: string }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  const staff = await requirePermission("clients.view");
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*, client:clients(id, name)")
    .eq("id", Number(id))
    .is("archived_at", null)
    .maybeSingle();
  if (!company) notFound();
  const client = company.client as { id: number; name: string };

  if (staff.can("projects.manage")) {
    const { data: projectIds } = await supabase.from("projects").select("id").eq("company_id", company.id).is("archived_at", null);
    await Promise.all(
      (projectIds ?? []).flatMap((p) => [
        supabase.rpc("ensure_project_stages", { p_project_id: p.id }),
        supabase.rpc("ensure_project_checklist", { p_project_id: p.id }),
      ])
    );
  }

  const [{ data: projects }, { data: people }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, govt_reference_no, assignee:profiles!projects_assigned_to_fkey(full_name), stages:project_stages(status)")
      .eq("company_id", company.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_people")
      .select("id, role, is_primary, person:people(id, full_name, phone, email)")
      .eq("company_id", company.id)
      .is("archived_at", null)
      .order("is_primary", { ascending: false }),
  ]);

  const canManage = staff.can("clients.manage");

  return (
    <>
      {notice.person && <Notice>Person saved.</Notice>}
      {notice.archived && <Notice>Project archived.</Notice>}
      <PageHead title={company.name} sub={<>For client <Link href={`/clients/${client.id}`}>{client.name}</Link></>}>
        {canManage && <LinkButton variant="secondary" href={`/companies/${company.id}/edit`}>Edit company</LinkButton>}
        {staff.can("projects.manage") && <LinkButton href={`/companies/${company.id}/projects/new`}>Add project</LinkButton>}
      </PageHead>

      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">Projects</h2>
            {!projects?.length ? (
              <p className="text-muted">No projects yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {projects.map((p) => {
                  const assignee = p.assignee as unknown as { full_name: string } | null;
                  const stages = (p.stages ?? []) as { status: string }[];
                  const done = stages.filter((s) => s.status === "done").length;
                  return (
                    <li key={p.id} className="py-3">
                      <Link href={`/projects/${p.id}`} className="font-semibold">{p.title}</Link>
                      <div className="text-sm text-muted">
                        {p.govt_reference_no && <>{p.govt_reference_no} · </>}
                        {done} of {stages.length} stages done · {assignee?.full_name ?? "Unassigned"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">People</h2>
            {!people?.length ? (
              <p className="text-muted">No contacts yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {people.map((cp) => {
                  const person = cp.person as unknown as { id: number; full_name: string; phone: string | null; email: string | null };
                  return (
                    <li key={cp.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{person.full_name}</span>
                          {cp.is_primary && <Tag tone="brass">Primary</Tag>}
                        </div>
                        <div className="text-sm text-muted">
                          {label(PERSON_ROLES, cp.role)}
                          {person.phone && <> · <a href={`tel:${person.phone}`}>{person.phone}</a></>}
                          {person.email && <> · <a href={`mailto:${person.email}`}>{person.email}</a></>}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href={`/people/${person.id}/edit`} className="text-sm">Edit</Link>
                          {!cp.is_primary && (
                            <ActionForm action={setPrimaryContact.bind(null, company.id, cp.id)}>
                              <Submit variant="secondary" small>Set as primary</Submit>
                            </ActionForm>
                          )}
                          {staff.can("data.delete") && (
                            <ActionForm action={unlinkPersonFromCompany.bind(null, company.id, cp.id)} confirm="Remove this person from the company? They stay in the database.">
                              <Submit variant="danger" small>Remove</Submit>
                            </ActionForm>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {canManage && (
              <div className="mt-4 border-t border-rule pt-4">
                <LinkButton variant="secondary" small href={`/companies/${company.id}/people/new`}>Add person</LinkButton>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">Company details</h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted">Type</dt><dd>{label(CONSTITUTIONS, company.constitution)}</dd>
              <dt className="text-muted">GSTIN</dt><dd>{company.gstin || "—"}</dd>
              <dt className="text-muted">PAN</dt><dd>{company.pan || "—"}</dd>
              <dt className="text-muted">District</dt><dd>{company.district || "—"}</dd>
              <dt className="text-muted">Industry</dt><dd>{company.industry || "—"}</dd>
            </dl>
          </section>
          {company.notes && (
            <section className="panel">
              <h2 className="mb-2 text-lg font-semibold">Notes</h2>
              <p className="whitespace-pre-line">{company.notes}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
