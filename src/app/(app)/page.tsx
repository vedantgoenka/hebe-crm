import Link from "next/link";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { greeting, formatDate, isOverdue, todayIST } from "@/lib/format";
import { LEAD_SOURCES, LEAD_STATUSES, label } from "@/lib/options";
import { LinkButton } from "@/components/ui/button";
import { Notice, PageHead } from "@/components/page-head";

export default async function MyWorkPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const staff = await getStaff();
  const supabase = await createClient();
  const today = todayIST();

  const [{ data: tasks }, { data: callbacks }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_on, lead:leads(id, name), client:clients(id, name)")
      .eq("assigned_to", staff.id)
      .eq("status", "open")
      .is("archived_at", null)
      .or(`due_on.is.null,due_on.lte.${todayIST(7)}`)
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from("leads")
      .select("id, name, company_name, status, next_follow_up_on")
      .eq("assigned_to", staff.id)
      .not("status", "in", "(converted,lost)")
      .is("archived_at", null)
      .lte("next_follow_up_on", today)
      .order("next_follow_up_on")
      .limit(20),
  ]);

  const owner = staff.can("reports.view") ? await ownerFigures() : null;
  const firstName = staff.fullName.split(" ")[0];

  return (
    <>
      {denied && <Notice tone="alert">You don&apos;t have permission to open that page. Ask the admin if you need it.</Notice>}
      <PageHead
        title={`${greeting()}, ${firstName}`}
        sub={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
      >
        {staff.can("leads.manage") && <LinkButton href="/leads/new">Add lead</LinkButton>}
      </PageHead>

      {owner && (
        <dl aria-label="Business at a glance" className="mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-rule bg-white sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["New leads this month", owner.newLeads],
            ["Open leads", owner.openLeads],
            ["Converted this month", owner.converted],
            [`Clients (${owner.outside} outside Bihar)`, owner.clients],
            ["Overdue follow-ups", owner.overdue],
          ].map(([text, value], i) => (
            <div key={i} className="border-b border-r border-rule px-5 py-4 last:border-r-0">
              <dd className={`text-3xl font-bold tabular-nums ${i === 4 && Number(value) > 0 ? "text-alert" : ""}`}>{value}</dd>
              <dt className="text-sm text-muted">{text}</dt>
            </div>
          ))}
        </dl>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">My follow-ups for the next 7 days</h2>
            {!tasks?.length ? (
              <p className="text-muted">Nothing due. Add follow-ups from a lead or client page.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {tasks.map((t) => {
                  const lead = t.lead as unknown as { id: number; name: string } | null;
                  const client = t.client as unknown as { id: number; name: string } | null;
                  return (
                    <li key={t.id} className="py-3">
                      <div>{t.title}</div>
                      <div className="text-sm text-muted">
                        {lead && <Link href={`/leads/${lead.id}`}>{lead.name}</Link>}
                        {client && <Link href={`/clients/${client.id}`}>{client.name}</Link>}
                        {t.due_on && (
                          <>
                            {(lead || client) && ", "}due{" "}
                            <span className={isOverdue(t.due_on) ? "font-semibold text-alert" : ""}>
                              {t.due_on === today ? "today" : formatDate(t.due_on)}
                            </span>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">My leads to call back</h2>
            {!callbacks?.length ? (
              <p className="text-muted">No lead callbacks due today.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {callbacks.map((l) => (
                  <li key={l.id} className="py-3">
                    <Link href={`/leads/${l.id}`}>{l.name}</Link>
                    {l.company_name && <span className="text-muted">, {l.company_name}</span>}
                    <div className="text-sm text-muted">
                      {label(LEAD_STATUSES, l.status)}, call back{" "}
                      <span className={isOverdue(l.next_follow_up_on) ? "font-semibold text-alert" : ""}>
                        {l.next_follow_up_on === today ? "today" : formatDate(l.next_follow_up_on)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {owner && (
          <div className="space-y-5">
            <section className="panel">
              <h2 className="mb-3 text-lg font-semibold">Where leads came from (12 months)</h2>
              {!owner.bySource.length ? (
                <p className="text-muted">No leads yet.</p>
              ) : (
                <table className="table">
                  <tbody>
                    {owner.bySource.map(([source, count]) => (
                      <tr key={source}>
                        <td>{label(LEAD_SOURCES, source, source)}</td>
                        <td className="text-right tabular-nums">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel overflow-x-auto">
              <h2 className="mb-3 text-lg font-semibold">Team</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th className="text-right">Open leads</th>
                    <th className="text-right">Follow-ups</th>
                    <th className="text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {owner.team.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td className="text-right tabular-nums">{m.openLeads}</td>
                      <td className="text-right tabular-nums">{m.openTasks}</td>
                      <td className={`text-right tabular-nums ${m.overdue ? "font-semibold text-alert" : ""}`}>{m.overdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </div>
    </>
  );
}

async function ownerFigures() {
  const supabase = await createClient();
  const today = todayIST();
  const monthStart = `${today.slice(0, 8)}01T00:00:00+05:30`;
  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();

  const count = { count: "exact" as const, head: true };
  const [newLeads, openLeads, converted, clients, outside, overdue, sources, staff, openLeadRows, openTaskRows] = await Promise.all([
    supabase.from("leads").select("id", count).is("archived_at", null).gte("created_at", monthStart),
    supabase.from("leads").select("id", count).is("archived_at", null).not("status", "in", "(converted,lost)"),
    supabase.from("leads").select("id", count).is("archived_at", null).eq("status", "converted").gte("updated_at", monthStart),
    supabase.from("clients").select("id", count).is("archived_at", null),
    supabase.from("clients").select("id", count).is("archived_at", null).eq("is_outside_bihar", true),
    supabase.from("tasks").select("id", count).is("archived_at", null).eq("status", "open").lt("due_on", today),
    supabase.from("leads").select("source").is("archived_at", null).gte("created_at", yearAgo),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("leads").select("assigned_to").is("archived_at", null).not("status", "in", "(converted,lost)"),
    supabase.from("tasks").select("assigned_to, due_on").is("archived_at", null).eq("status", "open"),
  ]);

  const bySource = new Map<string, number>();
  for (const row of sources.data ?? []) bySource.set(row.source, (bySource.get(row.source) ?? 0) + 1);

  const team = (staff.data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    openLeads: (openLeadRows.data ?? []).filter((l) => l.assigned_to === p.id).length,
    openTasks: (openTaskRows.data ?? []).filter((t) => t.assigned_to === p.id).length,
    overdue: (openTaskRows.data ?? []).filter((t) => t.assigned_to === p.id && t.due_on && t.due_on < today).length,
  }));

  return {
    newLeads: newLeads.count ?? 0,
    openLeads: openLeads.count ?? 0,
    converted: converted.count ?? 0,
    clients: clients.count ?? 0,
    outside: outside.count ?? 0,
    overdue: overdue.count ?? 0,
    bySource: [...bySource.entries()].sort((a, b) => b[1] - a[1]),
    team,
  };
}
