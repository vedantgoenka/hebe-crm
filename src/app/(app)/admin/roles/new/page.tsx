import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PageHead } from "@/components/page-head";
import { RoleForm } from "../role-form";

export const metadata: Metadata = { title: "Add role" };

export default async function NewRolePage() {
  await requirePermission("admin.users");
  return (
    <>
      <PageHead title="Add role" />
      <RoleForm />
    </>
  );
}
