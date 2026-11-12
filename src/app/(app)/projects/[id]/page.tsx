import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { archiveProject } from "@/lib/actions/projects";
import { ActionForm, Submit } from "@/components/form";
import { LinkButton } from "@/components/ui/button";
import { Notice, PageHead } from "@/components/page-head";
import { ActivityPanel } from "@/components/crm/activity-panel";
import { StageTrack, type Stage } from "@/components/crm/stage-track";
import { ChecklistGroup, checklistSummary, type ChecklistRow } from "@/components/crm/checklist-group";
import { PERSON_ROLES, label } from "@/lib/options";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const staff = await requirePermission("projects.view");
  const supabase = await createClient();
  const projectId = Number(id);

  const { data: project } = await supabase
    .from("projects")
    .select("*, company:companies(id, name, client:clients(id, name)), assignee:profiles!projects_assigned_to_fkey(full_name)")
    .eq("id", projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (!project) notFound();

  // Backfill rows for any stage templates or checklist items added since this project was created.
  if (staff.can("projects.manage")) {
    await Promise.all([
      supabase.rpc("ensure_project_stages", { p_project_id: projectId }),
      supabase.rpc("ensure_project_checklist", { p_project_id: projectId }),
    ]);
  }

  const company = project.company as unknown as { id: number; name: string; client: { id: number; name: string } };
  const assignee = project.assignee as unknown as { full_name: string } | null;

  const [{ data: stageRows }, { data: checklistRows }, { data: contacts }] = await Promise.all([
    supabase
      .from("project_stages")
      .select("id, status, due_on, completed_on, note, stage:stage_templates(name, sort_order)")
      .eq("project_id", projectId)
      .is("archived_at", null),
    supabase
      .from("project_checklist")
      .select("id, status, note, item:checklist_items(name, sort_order, stage:stage_templates(name, sort_order))")
      .eq("project_id", projectId),
    supabase
      .from("company_people")
      .select("id, role, is_primary, person:people(full_name, phone, email)")
      .eq("company_id", company.id)
      .is("archived_at", null)
      .order("is_primary", { ascending: false }),
  ]);

  const stages: Stage[] = (stageRows ?? []).map((r) => {
    const t = r.stage as unknown as { name: string; sort_order: number };
    return { id: r.id, stageName: t.name, sortOrder: t.sort_order, status: r.status, due_on: r.due_on, completed_on: r.completed_on, note: r.note };
  });
  const checklist: ChecklistRow[] = (checklistRows ?? []).map((r) => {
    const item = r.item as unknown as { name: string; sort_order: number; stage: { name: string; sort_order: number } };
    return { id: r.id, itemName: item.name, stageName: item.stage.name, stageSortOrder: item.stage.sort_order, status: r.status, note: r.note };
  });
  const { received, total } = checklistSummary(checklist);

  return (
    <>
      {saved && <Notice>Project saved.</Notice>}
      <PageHead
        title={project.title}
        sub={
          <>
            <Link href={`/companies/${company.id}`}>{company.name}</Link>, <Link href={`/clients/${company.client.id}`}>{company.client.name}</Link>
            {project.govt_reference_no && <> · {project.govt_reference_no}</>} · {assignee?.full_name ?? "Unassigned"}
            {total > 0 && <> · {received} of {total} documents received</>}
          </>
        }
      >
        {staff.can("projects.manage") && <LinkButton variant="secondary" href={`/projects/${project.id}/edit`}>Edit</LinkButton>}
      </PageHead>

      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <StageTrack projectId={project.id} stages={stages} canManage={staff.can("projects.manage")} />
          <ChecklistGroup projectId={project.id} rows={checklist} canManage={staff.can("projects.manage")} />
          <ActivityPanel subject={{ kind: "project", id: project.id }} canManage={staff.can("projects.manage")} me={staff.id} />
        </div>

        <div className="space-y-5">
          <section className="panel">
            <h2 className="mb-3 text-lg font-semibold">Contacts</h2>
            {!contacts?.length ? (
              <p className="text-muted">No contacts yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {contacts.map((cp) => {
                  const person = cp.person as unknown as { full_name: string; phone: string | null; email: string | null };
                  return (
                    <li key={cp.id} className="py-2.5">
                      <div>{person.full_name}{cp.is_primary && " (Primary)"}</div>
                      <div className="text-sm text-muted">
                        {label(PERSON_ROLES, cp.role)}
                        {person.phone && <> · <a href={`tel:${person.phone}`}>{person.phone}</a></>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-sm"><Link href={`/companies/${company.id}`}>Manage contacts</Link></p>
          </section>
          {project.notes && (
            <section className="panel">
              <h2 className="mb-2 text-lg font-semibold">Notes</h2>
              <p className="whitespace-pre-line">{project.notes}</p>
            </section>
          )}
          {staff.can("data.delete") && (
            <ActionForm action={archiveProject.bind(null, company.id, project.id)} confirm="Archive this project? It will disappear from lists but stay in the database.">
              <Submit variant="danger" small>Archive project</Submit>
            </ActionForm>
          )}
        </div>
      </div>
    </>
  );
}
