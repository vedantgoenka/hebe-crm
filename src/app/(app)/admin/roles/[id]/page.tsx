import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/page-head";
import { RoleForm } from "../role-form";

export const metadata: Metadata = { title: "Edit role" };

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("admin.users");
  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("id, name, description, permissions").eq("id", Number(id)).maybeSingle();
  if (!role) notFound();
  return (
    <>
      <PageHead title={`Edit ${role.name}`} />
      <RoleForm role={role} />
    </>
  );
}
