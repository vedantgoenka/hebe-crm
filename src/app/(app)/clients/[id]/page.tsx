import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { archiveClient } from "@/lib/actions/clients";
import { formatDate } from "@/lib/format";
import { CONSTITUTIONS, LEAD_SOURCES, label } from "@/lib/options";
import { ActionForm, Submit } from "@/components/form";
import { LinkButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Notice, PageHead } from "@/components/page-head";
import { ActivityPanel } from "@/components/crm/activity-panel";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; converted?: string; company?: string }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  const staff = await requirePermission("clients.view");
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*, owner:profiles!clients_relationship_owner_fkey(full_name), companies(id, name, constitution, gstin, district, industry, archived_at, projects(id, archived_at)), origin:leads!leads_converted_client_id_fkey(id)")
    .eq("id", Number(id))
    .is("archived_at", null)
    .maybeSingle();
  if (!client) notFound();

  const owner = client.owner as { full_name: string } | null;
  const companies = ((client.companies ?? []) as { id: number; name: string; constitution: string | null; gstin: string | null; district: string | null; industry: string | null; archived_at: string | null; projects: { id: number; archived_at: string | null }[] }[])
    .filter((c) => !c.archived_at)
    .sort((a, b) => a.name.localeCompare(b.name));
  const origin = (client.origin as { id: number }[] | null)?.[0];
  const place = [client.city, client.state].filter(Boolean).join(", ");

  return (
    <>
      {notice.converted && <Notice>Lead converted. Add company details below.</Notice>}
      {notice.saved && <Notice>Client saved.</Notice>}
      {notice.company && <Notice>Company saved.</Notice>}
      <PageHead
        title={client.name}
        sub={<>{place || "Location not added"} {client.is_outside_bihar && <Tag tone="brass">Outside Bihar</Tag>}</>}
      >
        {staff.can("clients.manage") && (
          <>
            <LinkButton variant="secondary" href={`/clients/${client.id}/edit`}>Edit</LinkButton>
            <LinkButton href={`/clients/${client.id}/companies/new`}>Add company</LinkButton>
          </>
        )}
      </PageHead>

      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">Companies</h2>
            {!companies.length ? (
              <p className="text-muted">No companies yet. Add the company this client is setting up or running.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Company</th><th>Type</th><th>GSTIN</th><th>District</th><th className="text-right">Projects</th><th /></tr></thead>
                  <tbody>
                    {companies.map((c) => (
                      <tr key={c.id}>
                        <td><Link href={`/companies/${c.id}`}>{c.name}</Link><div className="text-sm text-muted">{c.industry}</div></td>
                        <td>{label(CONSTITUTIONS, c.constitution)}</td>
                        <td>{c.gstin || "—"}</td>
                        <td>{c.district || "—"}</td>
                        <td className="text-right tabular-nums">{c.projects.filter((p) => !p.archived_at).length}</td>
                        <td>{staff.can("clients.manage") && <Link href={`/companies/${c.id}/edit`}>Edit</Link>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <ActivityPanel subject={{ kind: "client", id: client.id }} canManage={staff.can("clients.manage")} me={staff.id} />
        </div>

        <div className="space-y-5">
          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">Contact</h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted">Phone</dt><dd>{[client.phone, client.alt_phone].filter(Boolean).join(", ") || "—"}</dd>
              <dt className="text-muted">Email</dt><dd className="break-all">{client.email || "—"}</dd>
              <dt className="text-muted">PAN</dt><dd>{client.pan || "—"}</dd>
              <dt className="text-muted">Owner</dt><dd>{owner?.full_name ?? "Not assigned"}</dd>
              <dt className="text-muted">Source</dt><dd>{label(LEAD_SOURCES, client.source)}</dd>
              <dt className="text-muted">Referred by</dt><dd>{client.referred_by || "—"}</dd>
              <dt className="text-muted">Client since</dt><dd>{formatDate(client.created_at)}</dd>
            </dl>
            {client.address && (
              <>
                <h3 className="mb-1 mt-4 font-semibold">Address</h3>
                <p className="whitespace-pre-line">{client.address}</p>
              </>
            )}
            {origin && <p className="mt-4 text-sm"><Link href={`/leads/${origin.id}`}>See the original lead</Link></p>}
          </section>

          {client.notes && (
            <section className="panel">
              <h2 className="mb-2 text-lg font-semibold">Notes</h2>
              <p className="whitespace-pre-line">{client.notes}</p>
            </section>
          )}

          {staff.can("data.delete") && (
            <ActionForm action={archiveClient.bind(null, client.id)} confirm="Archive this client? They will disappear from lists but stay in the database.">
              <Submit variant="danger" small>Archive client</Submit>
            </ActionForm>
          )}
        </div>
      </div>
    </>
  );
}
