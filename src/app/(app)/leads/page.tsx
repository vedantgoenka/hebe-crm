import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchTerm } from "@/lib/data";
import { formatDate, isOverdue } from "@/lib/format";
import { LEAD_SOURCES, LEAD_STATUSES, label } from "@/lib/options";
import { LinkButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Notice, PageHead } from "@/components/page-head";
import { Pager } from "@/components/pager";
import { LeadContact } from "@/components/crm/lead-contact";

export const metadata: Metadata = { title: "Leads" };
const PAGE_SIZE = 25;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const staff = await requirePermission("leads.view");
  const supabase = await createClient();
  const page = Math.max(1, Number(params.page) || 1);

  let query = supabase
    .from("leads")
    .select("id, name, company_name, phone, email, state, is_outside_bihar, source, status, next_follow_up_on, opportunity_reason, service:service_types(name), assignee:profiles!leads_assigned_to_fkey(full_name)", { count: "exact" })
    .is("archived_at", null);

  const term = searchTerm(params.q);
  if (term) query = query.or(`name.ilike.${term},phone.ilike.${term},company_name.ilike.${term}`);
  if (params.status && params.status in LEAD_STATUSES) query = query.eq("status", params.status);
  else query = query.not("status", "in", "(converted,lost)");
  if (params.mine) query = query.eq("assigned_to", staff.id);

  const { data: leads, count } = await query
    .order("next_follow_up_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <>
      {params.archived && <Notice>Lead archived. The Master Admin can still see it.</Notice>}
      <PageHead title="Leads" sub="Enquiries that have not yet become clients">
        {staff.can("leads.manage") && <LinkButton href="/leads/new">Add lead</LinkButton>}
      </PageHead>

      <form className="mb-4 flex flex-wrap items-center gap-3" action="/leads">
        <input type="search" name="q" defaultValue={params.q} placeholder="Search name, phone or company" aria-label="Search leads" className="input max-w-72" />
        <select name="status" defaultValue={params.status ?? ""} aria-label="Status" className="input w-auto">
          <option value="">All open leads</option>
          {Object.entries(LEAD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2"><input type="checkbox" name="mine" value="1" defaultChecked={Boolean(params.mine)} /> Only mine</label>
        <button className="cursor-pointer rounded border border-ledger bg-white px-4 py-2 font-semibold text-ledger" type="submit">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Contact</th><th>Service</th><th>Source</th><th>Status</th><th>Assigned to</th><th>Call back</th></tr>
          </thead>
          <tbody>
            {leads?.length ? leads.map((l) => {
              const service = l.service as unknown as { name: string } | null;
              const assignee = l.assignee as unknown as { full_name: string } | null;
              const open = l.status !== "converted" && l.status !== "lost";
              return (
                <tr key={l.id}>
                  <td>
                    <Link href={`/leads/${l.id}`}>{l.name}</Link>
                    <div className="text-sm text-muted">
                      {l.company_name} {l.is_outside_bihar && <Tag tone="brass">{l.state}</Tag>}
                    </div>
                    {l.opportunity_reason && <div className="text-sm text-muted">{l.opportunity_reason}</div>}
                  </td>
                  <td><LeadContact name={l.name} companyName={l.company_name} phone={l.phone} email={l.email} /></td>
                  <td>{service?.name ?? "—"}</td>
                  <td>{label(LEAD_SOURCES, l.source)}</td>
                  <td><Tag tone={l.status === "converted" ? "ok" : l.status === "lost" ? "alert" : "plain"}>{label(LEAD_STATUSES, l.status)}</Tag></td>
                  <td>{assignee?.full_name ?? "Unassigned"}</td>
                  <td>
                    {l.next_follow_up_on
                      ? <span className={open && isOverdue(l.next_follow_up_on) ? "font-semibold text-alert" : ""}>{formatDate(l.next_follow_up_on)}</span>
                      : <span className="text-muted">Not set</span>}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={7} className="text-muted">No leads match. {staff.can("leads.manage") && <Link href="/leads/new">Add a lead.</Link>}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={count ?? 0} size={PAGE_SIZE} params={params} base="/leads" />
    </>
  );
}
