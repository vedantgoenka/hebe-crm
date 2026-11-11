"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid, type FormState } from "@/lib/forms";
import { clientSchema, companySchema } from "@/lib/validation";

export async function saveClient(clientId: number | null, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("clients.manage");
  const parsed = clientSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  if (clientId) {
    const { error } = await supabase.from("clients").update(parsed.data).eq("id", clientId);
    if (error) return dbError(error);
    revalidatePath(`/clients/${clientId}`);
    redirect(`/clients/${clientId}?saved=1`);
  }

  const { data, error } = await supabase.from("clients").insert(parsed.data).select("id").single();
  if (error || !data) return dbError(error);
  redirect(`/clients/${data.id}?saved=1`);
}

export async function archiveClient(clientId: number): Promise<FormState> {
  await requirePermission("data.delete");
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ archived_at: new Date().toISOString() }).eq("id", clientId);
  if (error) return dbError(error);
  redirect("/clients?archived=1");
}

export async function saveCompany(clientId: number, companyId: number | null, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("clients.manage");
  const parsed = companySchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = companyId
    ? await supabase.from("companies").update(parsed.data).eq("id", companyId)
    : await supabase.from("companies").insert({ ...parsed.data, client_id: clientId });
  if (error) return dbError(error);

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?company=1`);
}

export async function archiveCompany(clientId: number, companyId: number): Promise<FormState> {
  await requirePermission("data.delete");
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ archived_at: new Date().toISOString() }).eq("id", companyId);
  if (error) return dbError(error);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}
