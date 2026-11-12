import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { archiveLead, convertLead } from "@/lib/actions/leads";
import { formatDate } from "@/lib/format";
import { LEAD_SOURCES, LEAD_STATUSES, label, type LeadStatus } from "@/lib/options";
import { ActionForm, Submit } from "@/components/form";
import { LinkButton } from "@/components/ui/button";
import { Notice, PageHead } from "@/components/page-head";
import { ActivityPanel } from "@/components/crm/activity-panel";
import { LeadContact } from "@/components/crm/lead-contact";

export const metadata: Metadata = { title: "Lead" };

const STEPS: LeadStatus[] = ["new", "contacted", "meeting_scheduled", "meeting_done", "converted"];

export default async function LeadPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const staff = await requirePermission("leads.view");
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*, service:service_types(name), assignee:profiles!leads_assigned_to_fkey(full_name), creator:profiles!leads_created_by_fkey(full_name)")
    .eq("id", Number(id))
    .is("archived_at", null)
    .maybeSingle();
  if (!lead) notFound();

  const service = lead.service as { name: string } | null;
  const assignee = lead.assignee as { full_name: string } | null;
  const creator = lead.creator as { full_name: string } | null;
  const lost = lead.status === "lost";
  const current = STEPS.indexOf(lead.status as LeadStatus);
  const place = [lead.city, lead.state].filter(Boolean).join(", ");

  return (
    <>
      {saved && <Notice>Lead saved.</Notice>}
      <PageHead title={lead.name} sub={`${lead.company_name || "No company yet"}${place ? `, ${place}` : ""}`}>
        {staff.can("leads.manage") && <LinkButton variant="secondary" href={`/leads/${lead.id}/edit`}>Edit</LinkButton>}
        {lead.converted_client_id ? (
          <LinkButton href={`/clients/${lead.converted_client_id}`}>Open client</LinkButton>
        ) : !lost && staff.can("clients.manage") && staff.can("leads.manage") ? (
          <ActionForm action={convertLead.bind(null, lead.id)} confirm="Create a client record from this lead?">
            <Submit>Convert to client</Submit>
          </ActionForm>
        ) : null}
      </PageHead>

      <ol aria-label="Lead progress" className="journey mb-5 flex overflow-x-auto rounded-lg border border-rule bg-white px-5 py-4">
        {STEPS.map((step, i) => (
          <li
            key={step}
            data-state={lost ? undefined : i < current ? "done" : i === current ? "now" : undefined}
            aria-current={!lost && i === current ? "step" : undefined}
            className={`min-w-28 flex-1 text-sm ${!lost && i === current ? "font-semibold text-ink" : "text-muted"}`}
          >
            {LEAD_STATUSES[step]}
          </li>
        ))}
      </ol>
      {lost && <Notice tone="alert">Marked as lost{lead.lost_reason ? `: ${lead.lost_reason}` : ""}.</Notice>}

      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <ActivityPanel subject={{ kind: "lead", id: lead.id }} canManage={staff.can("leads.manage")} me={staff.id} />
        </div>
        <div className="space-y-5">
          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">Details</h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted">Contact</dt><dd><LeadContact name={lead.name} companyName={lead.company_name} phone={lead.phone} email={lead.email} /></dd>
              <dt className="text-muted">Service</dt><dd>{service?.name ?? "Not sure yet"}</dd>
              <dt className="text-muted">Source</dt><dd>{label(LEAD_SOURCES, lead.source)}</dd>
              <dt className="text-muted">Referred by</dt><dd>{lead.referred_by || "—"}</dd>
              <dt className="text-muted">Assigned to</dt><dd>{assignee?.full_name ?? "Unassigned"}</dd>
              <dt className="text-muted">Call back</dt><dd>{lead.next_follow_up_on ? formatDate(lead.next_follow_up_on) : "Not set"}</dd>
              <dt className="text-muted">Added</dt><dd>{formatDate(lead.created_at)}{creator ? ` by ${creator.full_name}` : ""}</dd>
            </dl>
            {lead.requirement && (
              <>
                <h3 className="mb-1 mt-4 font-semibold">What they want</h3>
                <p className="whitespace-pre-line">{lead.requirement}</p>
              </>
            )}
            {lead.opportunity_reason && (
              <>
                <h3 className="mb-1 mt-4 font-semibold">Opportunity reason</h3>
                <p className="whitespace-pre-line">{lead.opportunity_reason}</p>
              </>
            )}
          </section>
          {staff.can("data.delete") && (
            <ActionForm action={archiveLead.bind(null, lead.id)} confirm="Archive this lead? It will disappear from lists but stay in the database.">
              <Submit variant="danger" small>Archive lead</Submit>
            </ActionForm>
          )}
          <p className="text-sm"><Link href="/leads">Back to leads</Link></p>
        </div>
      </div>
    </>
  );
}
