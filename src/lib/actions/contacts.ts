"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid, type FormState } from "@/lib/forms";
import { companyPersonSchema, personSchema } from "@/lib/validation";

export async function createPersonAndLink(companyId: number, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("clients.manage");
  const raw = formObject(formData);
  const person = personSchema.safeParse(raw);
  const link = companyPersonSchema.safeParse(raw);
  if (!person.success) return invalid(person.error);
  if (!link.success) return invalid(link.error);

  const supabase = await createClient();
  const { data: created, error } = await supabase.from("people").insert(person.data).select("id").single();
  if (error || !created) return dbError(error);

  const { data: linked, error: linkError } = await supabase
    .from("company_people")
    .insert({ company_id: companyId, person_id: created.id, role: link.data.role })
    .select("id")
    .single();
  if (linkError || !linked) return dbError(linkError);

  if (link.data.is_primary) {
    const { error: primaryError } = await supabase.rpc("set_primary_contact", { p_company_person_id: linked.id });
    if (primaryError) return dbError(primaryError);
  }

  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?person=1`);
}

export async function linkPersonToCompany(companyId: number, personId: number): Promise<FormState> {
  await requirePermission("clients.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("company_people").insert({ company_id: companyId, person_id: personId });
  if (error) return dbError(error);
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?person=1`);
}

export async function updatePerson(personId: number, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("clients.manage");
  const parsed = personSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("people").update(parsed.data).eq("id", personId);
  if (error) return dbError(error);
  redirect(`/people/${personId}/edit?saved=1`);
}

export async function updateCompanyPersonRole(companyId: number, companyPersonId: number, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("clients.manage");
  const parsed = companyPersonSchema.pick({ role: true }).safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("company_people").update(parsed.data).eq("id", companyPersonId);
  if (error) return dbError(error);
  revalidatePath(`/companies/${companyId}`);
  return undefined;
}

export async function setPrimaryContact(companyId: number, companyPersonId: number): Promise<FormState> {
  await requirePermission("clients.manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_primary_contact", { p_company_person_id: companyPersonId });
  if (error) return dbError(error);
  revalidatePath(`/companies/${companyId}`);
  return undefined;
}

export async function unlinkPersonFromCompany(companyId: number, companyPersonId: number): Promise<FormState> {
  await requirePermission("data.delete");
  const supabase = await createClient();
  const { error } = await supabase.from("company_people").update({ archived_at: new Date().toISOString() }).eq("id", companyPersonId);
  if (error) return dbError(error);
  revalidatePath(`/companies/${companyId}`);
  return undefined;
}
