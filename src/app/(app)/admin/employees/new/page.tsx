import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/page-head";
import { EmployeeForm } from "../employee-form";

export const metadata: Metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  await requirePermission("admin.users");
  const supabase = await createClient();
  const { data: roles } = await supabase.from("roles").select("id, name").order("name");
  return (
    <>
      <PageHead title="Add employee" />
      <EmployeeForm roles={roles ?? []} />
    </>
  );
}
