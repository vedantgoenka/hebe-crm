import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchTerm } from "@/lib/data";
import { LinkButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Notice, PageHead } from "@/components/page-head";
import { Pager } from "@/components/pager";

export const metadata: Metadata = { title: "Clients" };
const PAGE_SIZE = 25;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const staff = await requirePermission("clients.view");
  const supabase = await createClient();
  const page = Math.max(1, Number(params.page) || 1);

  let query = supabase
    .from("clients")
    .select("id, name, phone, city, state, is_outside_bihar, owner:profiles!clients_relationship_owner_fkey(full_name), companies(count)", { count: "exact" })
    .is("archived_at", null)
    .is("companies.archived_at", null);

  const term = searchTerm(params.q);
  if (term) query = query.or(`name.ilike.${term},phone.ilike.${term},city.ilike.${term}`);
  if (params.outside) query = query.eq("is_outside_bihar", true);

  const { data: clients, count } = await query.order("name").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <>
      {params.archived && <Notice>Client archived. The Master Admin can still see it.</Notice>}
      <PageHead title="Clients" sub={`${count ?? 0} ${count === 1 ? "client" : "clients"}`}>
        {staff.can("data.export") && <LinkButton variant="secondary" href="/clients/export" prefetch={false}>Export CSV</LinkButton>}
        {staff.can("clients.manage") && <LinkButton href="/clients/new">Add client</LinkButton>}
      </PageHead>

      <form className="mb-4 flex flex-wrap items-center gap-3" action="/clients">
        <input type="search" name="q" defaultValue={params.q} placeholder="Search name, phone or city" aria-label="Search clients" className="input max-w-72" />
        <label className="flex items-center gap-2"><input type="checkbox" name="outside" value="1" defaultChecked={Boolean(params.outside)} /> Outside Bihar only</label>
        <button className="cursor-pointer rounded border border-ledger bg-white px-4 py-2 font-semibold text-ledger" type="submit">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="table">
          <thead>
            <tr><th>Client</th><th>Phone</th><th>Location</th><th className="text-right">Companies</th><th>Relationship owner</th></tr>
          </thead>
          <tbody>
            {clients?.length ? clients.map((c) => {
              const owner = c.owner as unknown as { full_name: string } | null;
              const companies = (c.companies as unknown as { count: number }[])?.[0]?.count ?? 0;
              return (
                <tr key={c.id}>
                  <td><Link href={`/clients/${c.id}`}>{c.name}</Link></td>
                  <td>{c.phone || "—"}</td>
                  <td>
                    {[c.city, c.state].filter(Boolean).join(", ") || "—"} {c.is_outside_bihar && <Tag tone="brass">Outside Bihar</Tag>}
                  </td>
                  <td className="text-right tabular-nums">{companies}</td>
                  <td>{owner?.full_name ?? "—"}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="text-muted">No clients match. Clients are added here or by converting a lead.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={count ?? 0} size={PAGE_SIZE} params={params} base="/clients" />
    </>
  );
}
