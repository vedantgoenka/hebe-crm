import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/page-head";
import { EmployeeForm } from "../employee-form";

export const metadata: Metadata = { title: "Edit employee" };

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("admin.users");
  const supabase = await createClient();
  const [{ data: employee }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, username, phone, role_id, is_master_admin").eq("id", id).maybeSingle(),
    supabase.from("roles").select("id, name").order("name"),
  ]);
  if (!employee) notFound();
  return (
    <>
      <PageHead title={`Edit ${employee.full_name}`} />
      <EmployeeForm employee={employee} roles={roles ?? []} />
    </>
  );
}
