"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid, type FormState } from "@/lib/forms";
import { leadSchema } from "@/lib/validation";

export async function saveLead(leadId: number | null, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("leads.manage");
  const parsed = leadSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { status, ...rest } = parsed.data;
  // A converted lead's form has no status field, so its status is left untouched.
  const values: Record<string, unknown> = status
    ? { ...rest, status, lost_reason: status === "lost" ? rest.lost_reason : null }
    : { ...rest, lost_reason: undefined };

  if (leadId) {
    const { error } = await supabase.from("leads").update(values).eq("id", leadId);
    if (error) return dbError(error);
    revalidatePath(`/leads/${leadId}`);
    redirect(`/leads/${leadId}?saved=1`);
  }

  const { data, error } = await supabase.from("leads").insert({ ...values, status: status ?? "new" }).select("id").single();
  if (error || !data) return dbError(error);
  redirect(`/leads/${data.id}?saved=1`);
}

export async function convertLead(leadId: number): Promise<FormState> {
  await requirePermission("clients.manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_lead", { p_lead_id: leadId });
  if (error || !data) return dbError(error);
  redirect(`/clients/${data}?converted=1`);
}

export async function archiveLead(leadId: number): Promise<FormState> {
  await requirePermission("data.delete");
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ archived_at: new Date().toISOString() }).eq("id", leadId);
  if (error) return dbError(error);
  redirect("/leads?archived=1");
}
