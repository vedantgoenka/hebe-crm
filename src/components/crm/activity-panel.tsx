import { createClient } from "@/lib/supabase/server";
import { getActiveStaff, staffOptions } from "@/lib/data";
import { addTask, completeTask, logActivity, type Subject } from "@/lib/actions/activity";
import { ActionForm, Submit } from "@/components/form";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { Tag } from "@/components/ui/tag";
import { ACTIVITY_TYPES, label } from "@/lib/options";
import { formatDate, formatDateTime, isOverdue, nowLocalInputIST, todayIST } from "@/lib/format";

/** Follow-ups and the call / meeting log for a lead or client. */
export async function ActivityPanel({ subject, canManage, me }: { subject: Subject; canManage: boolean; me: string }) {
  const supabase = await createClient();
  const column = `${subject.kind}_id`;
  const path = subject.kind === "lead" ? `/leads/${subject.id}` : subject.kind === "client" ? `/clients/${subject.id}` : `/projects/${subject.id}`;

  const [{ data: tasks }, { data: activities }, staff] = await Promise.all([
    supabase.from("tasks").select("id, title, due_on, assignee:profiles!tasks_assigned_to_fkey(full_name)")
      .eq(column, subject.id).eq("status", "open").is("archived_at", null).order("due_on", { nullsFirst: false }),
    supabase.from("activities").select("id, type, summary, occurred_at, author:profiles!activities_created_by_fkey(full_name)")
      .eq(column, subject.id).order("occurred_at", { ascending: false }).limit(100),
    getActiveStaff(),
  ]);

  return (
    <>
      <section className="panel">
        <h2 className="mb-3 text-lg font-semibold">Follow-ups</h2>
        {!tasks?.length ? (
          <p className="text-muted">No open follow-ups.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {tasks.map((t) => {
              const assignee = t.assignee as unknown as { full_name: string } | null;
              return (
                <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div>
                    <div>{t.title}</div>
                    <div className="text-sm text-muted">
                      {assignee?.full_name ?? "Unassigned"}
                      {t.due_on && (
                        <>, due <span className={isOverdue(t.due_on) ? "font-semibold text-alert" : ""}>{formatDate(t.due_on)}</span></>
                      )}
                    </div>
                  </div>
                  <ActionForm action={completeTask.bind(null, t.id, path)}>
                    <Submit variant="secondary" small>Mark done</Submit>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        )}

        {canManage && (
          <ActionForm action={addTask.bind(null, subject)} className="mt-4 border-t border-rule pt-4">
            <TextField name="title" label="Add a follow-up" placeholder="e.g. Call back about bank sanction" required />
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <SelectField name="assigned_to" label="For" options={staffOptions(staff)} defaultValue={me} />
              <TextField name="due_on" label="Due" type="date" defaultValue={todayIST(1)} />
            </div>
            <div className="mt-4"><Submit variant="secondary">Add follow-up</Submit></div>
          </ActionForm>
        )}
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-semibold">Calls, meetings and notes</h2>
        {canManage && (
          <ActionForm action={logActivity.bind(null, subject)} className="mb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField name="type" label="Type" options={ACTIVITY_TYPES} defaultValue="call" />
              <TextField name="occurred_at" label="When" type="datetime-local" defaultValue={nowLocalInputIST()} />
              <TextArea name="summary" label="What was discussed" className="sm:col-span-2" />
            </div>
            <div className="mt-4"><Submit>Log it</Submit></div>
          </ActionForm>
        )}

        {!activities?.length ? (
          <p className="text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-rule border-t border-rule">
            {activities.map((a) => {
              const author = a.author as unknown as { full_name: string } | null;
              return (
                <li key={a.id} className="py-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Tag>{label(ACTIVITY_TYPES, a.type)}</Tag>
                    {formatDateTime(a.occurred_at)}, {author?.full_name ?? "Former employee"}
                  </div>
                  <p className="whitespace-pre-line">{a.summary}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
