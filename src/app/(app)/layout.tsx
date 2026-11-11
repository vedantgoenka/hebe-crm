import Link from "next/link";
import { getStaff } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { NavLink } from "./nav-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="flex flex-col bg-ledger py-5 text-[#e8efeb] md:sticky md:top-0 md:h-screen">
        <div className="mb-3 border-b border-white/10 px-5 pb-5">
          <strong className="block text-2xl tracking-[0.06em] text-white">HEBE</strong>
          <span className="text-sm text-[#b9cbc2]">Financial Services</span>
        </div>
        <nav aria-label="Main" className="flex flex-wrap md:block">
          <NavLink href="/" exact>My work</NavLink>
          {staff.can("leads.view") && <NavLink href="/leads">Leads</NavLink>}
          {staff.can("clients.view") && <NavLink href="/clients">Clients</NavLink>}
          {staff.can("admin.users") && (
            <>
              <div className="hidden px-5 pb-1 pt-4 text-xs text-[#9db3a8] md:block">Admin</div>
              <NavLink href="/admin/employees">Employees</NavLink>
              <NavLink href="/admin/roles">Roles and permissions</NavLink>
            </>
          )}
        </nav>
        <div className="mt-auto border-t border-white/10 px-5 pt-4 text-sm">
          <div className="text-white">{staff.fullName}</div>
          <div className="text-[#b9cbc2]">{staff.roleName ?? "No role"}</div>
          <Link href="/account/password" className="mt-2 block text-[#dce6e0]">Change password</Link>
          <form action={logout}>
            <button type="submit" className="cursor-pointer text-[#dce6e0] underline">Log out</button>
          </form>
        </div>
      </aside>
      <main className="w-full max-w-[1180px] px-4 py-6 md:px-8 md:py-7">{children}</main>
    </div>
  );
}
