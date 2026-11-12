import { ActionForm, Submit } from "@/components/form";
import { SelectField, TextField } from "@/components/fields";
import { saveChecklistStatus } from "@/lib/actions/projects";
import { CHECKLIST_STATUSES, label } from "@/lib/options";

export type ChecklistRow = {
  id: number;
  itemName: string;
  stageName: string;
  stageSortOrder: number;
  status: string;
  note: string | null;
};

export function checklistSummary(rows: ChecklistRow[]) {
  const applicable = rows.filter((r) => r.status !== "not_needed");
  const received = applicable.filter((r) => r.status === "received").length;
  return { received, total: applicable.length };
}

export function ChecklistGroup({ projectId, rows, canManage }: { projectId: number; rows: ChecklistRow[]; canManage: boolean }) {
  const stages = [...new Set(rows.map((r) => r.stageName))].sort((a, b) => {
    const sa = rows.find((r) => r.stageName === a)?.stageSortOrder ?? 0;
    const sb = rows.find((r) => r.stageName === b)?.stageSortOrder ?? 0;
    return sa - sb;
  });

  return (
    <section className="panel">
      <h2 className="mb-3 text-lg font-semibold">Documents</h2>
      {!rows.length ? (
        <p className="text-muted">No checklist items set up yet.</p>
      ) : (
        stages.map((stageName) => (
          <div key={stageName} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-sm font-semibold text-muted">{stageName}</h3>
            <ul className="divide-y divide-rule border-t border-rule">
              {rows
                .filter((r) => r.stageName === stageName)
                .map((row) => (
                  <li key={row.id} className="py-2.5">
                    <div className="mb-1">{row.itemName}</div>
                    {canManage ? (
                      <ActionForm action={saveChecklistStatus.bind(null, row.id, projectId)} className="flex flex-wrap items-end gap-3">
                        <SelectField name="status" label="Status" options={CHECKLIST_STATUSES} defaultValue={row.status} />
                        <TextField name="note" label="Note" defaultValue={row.note} />
                        <Submit variant="secondary" small>Save</Submit>
                      </ActionForm>
                    ) : (
                      <div className="text-sm text-muted">{label(CHECKLIST_STATUSES, row.status)}{row.note ? `, ${row.note}` : ""}</div>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
