import { ActionForm, Submit } from "@/components/form";
import { SelectField, TextField } from "@/components/fields";
import { saveStage } from "@/lib/actions/projects";
import { STAGE_STATUSES, label } from "@/lib/options";
import { formatDate, isOverdue } from "@/lib/format";

export type Stage = {
  id: number;
  stageName: string;
  sortOrder: number;
  status: string;
  due_on: string | null;
  completed_on: string | null;
  note: string | null;
};

export function StageTrack({ projectId, stages, canManage }: { projectId: number; stages: Stage[]; canManage: boolean }) {
  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const firstActiveId = ordered.find((s) => s.status === "in_progress")?.id;

  return (
    <section className="panel">
      <h2 className="mb-3 text-lg font-semibold">Stages</h2>
      <ol aria-label="Project progress" className="journey mb-5 flex overflow-x-auto rounded-lg border border-rule bg-white px-5 py-4">
        {ordered.map((s) => (
          <li
            key={s.id}
            data-state={s.status === "done" ? "done" : s.status === "not_needed" ? "skipped" : s.id === firstActiveId ? "now" : undefined}
            className="min-w-28 flex-1 text-sm"
          >
            {s.stageName}
          </li>
        ))}
      </ol>

      <ul className="divide-y divide-rule">
        {ordered.map((s) => (
          <li key={s.id} className="py-3">
            <div className="mb-1 font-semibold">{s.stageName}</div>
            {canManage ? (
              <ActionForm action={saveStage.bind(null, s.id, projectId)} className="flex flex-wrap items-end gap-3">
                <SelectField name="status" label="Status" options={STAGE_STATUSES} defaultValue={s.status} />
                <TextField name="due_on" label="Due" type="date" defaultValue={s.due_on} />
                <TextField name="completed_on" label="Completed" type="date" defaultValue={s.completed_on} />
                <TextField name="note" label="Note" defaultValue={s.note} />
                <Submit variant="secondary" small>Save</Submit>
              </ActionForm>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <span>{label(STAGE_STATUSES, s.status)}</span>
                {s.due_on && <span className={isOverdue(s.due_on) && s.status !== "done" ? "font-semibold text-alert" : ""}>Due {formatDate(s.due_on)}</span>}
                {s.completed_on && <span>Completed {formatDate(s.completed_on)}</span>}
                {s.note && <span>{s.note}</span>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
