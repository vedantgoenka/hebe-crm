import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { ClientForm } from "@/components/crm/client-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Add client" };

export default async function NewClientPage() {
  await requirePermission("clients.manage");
  return (
    <>
      <PageHead title="Add client" />
      <ClientForm />
    </>
  );
}
