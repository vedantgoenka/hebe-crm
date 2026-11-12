"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid, type FormState } from "@/lib/forms";
import { checklistUpdateSchema, projectSchema, stageUpdateSchema } from "@/lib/validation";

export async function saveProject(companyId: number, projectId: number | null, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("projects.manage");
  const parsed = projectSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  if (projectId) {
    const { error } = await supabase.from("projects").update(parsed.data).eq("id", projectId);
    if (error) return dbError(error);
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}?saved=1`);
  }

  const { data, error } = await supabase.from("projects").insert({ ...parsed.data, company_id: companyId }).select("id").single();
  if (error || !data) return dbError(error);
  revalidatePath(`/companies/${companyId}`);
  redirect(`/projects/${data.id}?saved=1`);
}

export async function archiveProject(companyId: number, projectId: number): Promise<FormState> {
  await requirePermission("data.delete");
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ archived_at: new Date().toISOString() }).eq("id", projectId);
  if (error) return dbError(error);
  redirect(`/companies/${companyId}?archived=1`);
}

export async function saveStage(stageId: number, projectId: number, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("projects.manage");
  const parsed = stageUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("project_stages").update(parsed.data).eq("id", stageId);
  if (error) return dbError(error);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return undefined;
}

export async function saveChecklistStatus(rowId: number, projectId: number, _: FormState, formData: FormData): Promise<FormState> {
  const staff = await requirePermission("projects.manage");
  const parsed = checklistUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  // project_checklist has no stamp_row() trigger (no archived_at column), so updated_by is set here.
  const { error } = await supabase.from("project_checklist").update({ ...parsed.data, updated_by: staff.id }).eq("id", rowId);
  if (error) return dbError(error);

  revalidatePath(`/projects/${projectId}`);
  return undefined;
}
