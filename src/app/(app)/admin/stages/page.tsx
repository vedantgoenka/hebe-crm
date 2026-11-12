import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveChecklistItem, saveStageTemplate } from "@/lib/actions/admin-settings";
import { ActionForm, Submit } from "@/components/form";
import { TextField } from "@/components/fields";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Stages and documents" };

export default async function StagesAdminPage() {
  await requirePermission("admin.settings");
  const supabase = await createClient();

  const [{ data: stages }, { data: items }] = await Promise.all([
    supabase.from("stage_templates").select("id, name, sort_order, is_active").order("sort_order"),
    supabase.from("checklist_items").select("id, stage_template_id, name, sort_order, is_active").order("sort_order"),
  ]);

  return (
    <>
      <PageHead title="Stages and documents" sub="The 8-stage track and document checklist used by every project. Nothing here can be deleted, only renamed, reordered or switched off." />

      <div className="space-y-5">
        {(stages ?? []).map((stage) => (
          <section key={stage.id} className="panel">
            <ActionForm action={saveStageTemplate.bind(null, stage.id)} className="flex flex-wrap items-end gap-3 border-b border-rule pb-4">
              <TextField name="name" label="Stage name" defaultValue={stage.name} required className="min-w-56" />
              <TextField name="sort_order" label="Order" type="number" defaultValue={String(stage.sort_order)} className="w-24" />
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" name="is_active" value="1" defaultChecked={stage.is_active} />
                Active
              </label>
              <Submit variant="secondary" small>Save</Submit>
            </ActionForm>

            <div className="mt-3 space-y-3">
              {(items ?? []).filter((i) => i.stage_template_id === stage.id).map((item) => (
                <ActionForm key={item.id} action={saveChecklistItem.bind(null, item.id)} className="flex flex-wrap items-end gap-3 pl-5">
                  <input type="hidden" name="stage_template_id" value={stage.id} />
                  <TextField name="name" label="Document name" defaultValue={item.name} required className="min-w-56" />
                  <TextField name="sort_order" label="Order" type="number" defaultValue={String(item.sort_order)} className="w-24" />
                  <label className="flex items-center gap-2 pb-2">
                    <input type="checkbox" name="is_active" value="1" defaultChecked={item.is_active} />
                    Active
                  </label>
                  <Submit variant="secondary" small>Save</Submit>
                </ActionForm>
              ))}

              <ActionForm action={saveChecklistItem.bind(null, null)} className="flex flex-wrap items-end gap-3 pl-5">
                <input type="hidden" name="stage_template_id" value={stage.id} />
                <TextField name="name" label="Add a document for this stage" className="min-w-56" />
                <TextField name="sort_order" label="Order" type="number" defaultValue="0" className="w-24" />
                <input type="hidden" name="is_active" value="1" />
                <Submit small>Add document</Submit>
              </ActionForm>
            </div>
          </section>
        ))}

        <section className="panel">
          <h2 className="mb-3 text-lg font-semibold">Add a stage</h2>
          <ActionForm action={saveStageTemplate.bind(null, null)} className="flex flex-wrap items-end gap-3">
            <TextField name="name" label="Stage name" className="min-w-56" />
            <TextField name="sort_order" label="Order" type="number" defaultValue={String(((stages ?? []).length + 1) * 10)} className="w-24" />
            <input type="hidden" name="is_active" value="1" />
            <Submit small>Add stage</Submit>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
