import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/permissions";

export type Staff = {
  id: string;
  fullName: string;
  username: string;
  isMasterAdmin: boolean;
  roleName: string | null;
  can: (permission: Permission) => boolean;
};

/** The logged-in employee, read once per request. Redirects to /login if there is none. */
export const getStaff = cache(async (): Promise<Staff> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, is_master_admin, is_active, roles(name, permissions)")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?off=1");
  }

  const role = profile.roles as unknown as { name: string; permissions: string[] } | null;
  const granted = new Set(role?.permissions ?? []);

  return {
    id: profile.id,
    fullName: profile.full_name,
    username: profile.username,
    isMasterAdmin: profile.is_master_admin,
    roleName: profile.is_master_admin ? "Master Admin" : role?.name ?? null,
    can: (permission) => profile.is_master_admin || granted.has(permission),
  };
});

/** Use at the top of pages and server actions. The database enforces the same rules. */
export async function requirePermission(permission: Permission): Promise<Staff> {
  const staff = await getStaff();
  if (!staff.can(permission)) redirect("/?denied=1");
  return staff;
}
