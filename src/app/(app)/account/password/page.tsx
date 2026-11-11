import type { Metadata } from "next";
import { getStaff } from "@/lib/auth";
import { changePassword } from "@/lib/actions/account";
import { ActionForm, Submit } from "@/components/form";
import { TextField } from "@/components/fields";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Change password" };

export default async function PasswordPage() {
  await getStaff();
  return (
    <>
      <PageHead title="Change password" />
      <ActionForm action={changePassword} className="panel max-w-md space-y-4">
        <TextField name="current_password" label="Current password" type="password" autoComplete="current-password" required />
        <TextField name="password" label="New password" hint="8+ characters, letters and numbers" type="password" autoComplete="new-password" required />
        <TextField name="password_confirmation" label="Type the new password again" type="password" autoComplete="new-password" required />
        <Submit>Change password</Submit>
      </ActionForm>
    </>
  );
}
