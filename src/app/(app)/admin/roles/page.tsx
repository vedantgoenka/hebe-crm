import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ASSIGNABLE_PERMISSIONS } from "@/lib/permissions";
import { LinkButton } from "@/components/ui/button";
import { Notice, PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Roles and permissions" };

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  await requirePermission("admin.users");
  const supabase = await createClient();
  const { data: roles } = await supabase.from("roles").select("id, name, description, permissions, profiles(count)").order("name");

  return (
    <>
      {saved && <Notice>Role saved. Changes apply on each employee&apos;s next page load.</Notice>}
      <PageHead title="Roles and permissions" sub="Fees, archiving, data export and employee management stay with the Master Admin only">
        <LinkButton href="/admin/roles/new">Add role</LinkButton>
      </PageHead>
      <div className="overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="table">
          <thead><tr><th>Role</th><th>Can do</th><th className="text-right">Employees</th><th /></tr></thead>
          <tbody>
            {(roles ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.name}<div className="text-sm text-muted">{r.description}</div></td>
                <td className="text-sm">
                  {(r.permissions as string[]).map((p) => ASSIGNABLE_PERMISSIONS[p as keyof typeof ASSIGNABLE_PERMISSIONS]).filter(Boolean).join(", ") || "Nothing yet"}
                </td>
                <td className="text-right tabular-nums">{(r.profiles as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
                <td><Link href={`/admin/roles/${r.id}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
