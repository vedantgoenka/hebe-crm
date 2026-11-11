"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/env";
import type { FormState } from "@/lib/forms";

const schema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(parsed.data.username),
    password: parsed.data.password,
  });

  if (error) {
    // Same message for wrong password, unknown user and switched-off accounts.
    return { error: "Username or password is wrong, or the account is switched off." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
