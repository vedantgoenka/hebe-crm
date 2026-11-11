"use server";

import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/env";
import { formObject, invalid, type FormState } from "@/lib/forms";
import { passwordChangeSchema } from "@/lib/validation";

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const staff = await getStaff();
  const parsed = passwordChangeSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(staff.username),
    password: parsed.data.current_password,
  });
  if (checkError) return { fieldErrors: { current_password: ["That isn't your current password."] } };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return { ok: "Password changed." };
}
