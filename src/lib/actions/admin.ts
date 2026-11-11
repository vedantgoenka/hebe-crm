"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/env";
import { dbError, formObject, invalid, type FormState } from "@/lib/forms";
import { roleSchema, staffCreateSchema, staffUpdateSchema } from "@/lib/validation";

const FOREVER = "876000h"; // 100 years: Supabase's way of blocking a login

export async function createEmployee(_: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("admin.users");
  const parsed = staffCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { username, password, ...profile } = parsed.data;

  const admin = createAdminClient();
  const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { fieldErrors: { username: ["That username is already in use."] } };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { full_name: profile.full_name },
  });
  if (error || !created.user) return { error: error?.message ?? "Could not create the login." };

  const { error: profileError } = await admin.from("profiles").insert({ id: created.user.id, username, ...profile });
  if (profileError) {
    // Undo the half-created login so the username can be tried again.
    await admin.auth.admin.deleteUser(created.user.id);
    return dbError(profileError);
  }

  revalidatePath("/admin/employees");
  redirect(`/admin/employees?created=${encodeURIComponent(profile.full_name)}`);
}

export async function updateEmployee(userId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("admin.users");
  const parsed = staffUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { password, ...profile } = parsed.data;

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("is_master_admin").eq("id", userId).single();
  if (!existing) return { error: "Employee not found." };
  if (!existing.is_master_admin && !profile.role_id) return { fieldErrors: { role_id: ["Choose a role."] } };

  const { error } = await admin
    .from("profiles")
    .update(existing.is_master_admin ? { full_name: profile.full_name, phone: profile.phone } : profile)
    .eq("id", userId);
  if (error) return dbError(error);

  if (password) {
    const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password });
    if (pwError) return { error: `Details saved, but the password was not changed: ${pwError.message}` };
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees?saved=1");
}

/** Switch an employee off (login blocked) or back on. Their history stays. */
export async function toggleEmployee(userId: string): Promise<FormState> {
  const me = await requirePermission("admin.users");
  if (userId === me.id) return { error: "You can't switch yourself off." };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("is_active, is_master_admin").eq("id", userId).single();
  if (!target) return { error: "Employee not found." };
  if (target.is_master_admin) return { error: "The Master Admin can't be switched off." };

  const nowActive = !target.is_active;
  const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: nowActive ? "none" : FOREVER });
  if (banError) return { error: banError.message };

  const { error } = await admin.from("profiles").update({ is_active: nowActive }).eq("id", userId);
  if (error) return dbError(error);

  revalidatePath("/admin/employees");
  return undefined;
}

export async function saveRole(roleId: number | null, _: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("admin.users");
  const parsed = roleSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  // Roles are protected by row level security, so the normal client is enough here.
  const supabase = await createClient();
  const { error } = roleId
    ? await supabase.from("roles").update(parsed.data).eq("id", roleId)
    : await supabase.from("roles").insert(parsed.data);
  if (error) return dbError(error);

  revalidatePath("/admin/roles");
  redirect("/admin/roles?saved=1");
}
