"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid, type FormState } from "@/lib/forms";
import { checklistItemSchema, stageTemplateSchema } from "@/lib/validation";

export async function saveStageTemplate(templateId: number | null, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("admin.settings");
  const parsed = stageTemplateSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = templateId
    ? await supabase.from("stage_templates").update(parsed.data).eq("id", templateId)
    : await supabase.from("stage_templates").insert(parsed.data);
  if (error) return dbError(error);

  revalidatePath("/admin/stages");
  return { ok: "Saved." };
}

export async function toggleStageTemplateActive(templateId: number, isActive: boolean): Promise<FormState> {
  await requirePermission("admin.settings");
  const supabase = await createClient();
  const { error } = await supabase.from("stage_templates").update({ is_active: !isActive }).eq("id", templateId);
  if (error) return dbError(error);
  revalidatePath("/admin/stages");
  return undefined;
}

export async function saveChecklistItem(itemId: number | null, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("admin.settings");
  const parsed = checklistItemSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = itemId
    ? await supabase.from("checklist_items").update(parsed.data).eq("id", itemId)
    : await supabase.from("checklist_items").insert(parsed.data);
  if (error) return dbError(error);

  revalidatePath("/admin/stages");
  return { ok: "Saved." };
}

export async function toggleChecklistItemActive(itemId: number, isActive: boolean): Promise<FormState> {
  await requirePermission("admin.settings");
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").update({ is_active: !isActive }).eq("id", itemId);
  if (error) return dbError(error);
  revalidatePath("/admin/stages");
  return undefined;
}
