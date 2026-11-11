import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toggleEmployee } from "@/lib/actions/admin";
import { ActionForm, Submit } from "@/components/form";
import { LinkButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Notice, PageHead } from "@/components/page-head";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ created?: string; saved?: string }> }) {
  const notice = await searchParams;
  const me = await requirePermission("admin.users");
  const supabase = await createClient();
  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, username, phone, is_active, is_master_admin, role:roles(name)")
    .order("is_active", { ascending: false })
    .order("full_name");

  return (
    <>
      {notice.created && <Notice>{notice.created} can now log in. Share their username and password with them privately.</Notice>}
      {notice.saved && <Notice>Employee saved.</Notice>}
      <PageHead title="Employees" sub="Each employee logs in with their own username and password">
        <LinkButton href="/admin/employees/new">Add employee</LinkButton>
      </PageHead>

      <div className="overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Access</th><th /></tr></thead>
          <tbody>
            {(people ?? []).map((p) => {
              const role = p.role as unknown as { name: string } | null;
              return (
                <tr key={p.id}>
                  <td>{p.full_name}<div className="text-sm text-muted">{p.phone}</div></td>
                  <td>{p.username}</td>
                  <td>{p.is_master_admin ? <Tag tone="brass">Master Admin</Tag> : role?.name ?? "No role"}</td>
                  <td>{p.is_active ? <Tag tone="ok">Can log in</Tag> : <Tag tone="alert">Switched off</Tag>}</td>
                  <td>
                    <div className="flex items-center gap-4 whitespace-nowrap">
                      <Link href={`/admin/employees/${p.id}`}>Edit</Link>
                      {!p.is_master_admin && p.id !== me.id && (
                        <ActionForm
                          action={toggleEmployee.bind(null, p.id)}
                          confirm={p.is_active ? `Switch off ${p.full_name}? They won't be able to log in. Their records stay.` : undefined}
                        >
                          <Submit variant={p.is_active ? "danger" : "secondary"} small>{p.is_active ? "Switch off" : "Switch on"}</Submit>
                        </ActionForm>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">Switching an employee off stops their login immediately. Their leads, notes and history stay.</p>
    </>
  );
}
