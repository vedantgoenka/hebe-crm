import type { Metadata } from "next";
import { ActionForm, Submit } from "@/components/form";
import { TextField } from "@/components/fields";
import { login } from "./actions";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ off?: string }> }) {
  const { off } = await searchParams;

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col justify-end bg-ledger p-8 text-[#e8efeb] md:p-12">
        <strong className="block text-5xl tracking-[0.08em] text-white">HEBE</strong>
        <p className="mt-3 max-w-[34ch] text-[#c4d4cb]">
          Financial Services Pvt. Ltd. Helping investors set up and grow industry in Bihar for over 30 years.
        </p>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-2xl font-bold">Log in to HEBE CRM</h1>
          {off && (
            <p role="alert" className="mb-4 rounded border border-[#f1b8b1] bg-alert-soft px-4 py-3">
              This account is switched off. Ask the admin to switch it on.
            </p>
          )}
          <ActionForm action={login} className="space-y-4">
            <TextField name="username" label="Username" autoComplete="username" required />
            <TextField name="password" label="Password" type="password" autoComplete="current-password" required />
            <Submit>Log in</Submit>
          </ActionForm>
          <p className="mt-6 text-sm text-muted">Forgot your password? Ask the admin to set a new one.</p>
        </div>
      </div>
    </div>
  );
}
