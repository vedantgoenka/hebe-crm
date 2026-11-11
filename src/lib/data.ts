import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type StaffOption = { id: string; full_name: string };

export const getActiveStaff = cache(async (): Promise<StaffOption[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name");
  return data ?? [];
});

export const getServiceTypes = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("service_types").select("id, name").eq("is_active", true).order("sort_order");
  return data ?? [];
});

export function staffOptions(staff: StaffOption[]) {
  return staff.map((s) => ({ value: s.id, label: s.full_name }));
}

/** Escapes text used inside a PostgREST `or=(...ilike...)` filter. */
export function searchTerm(q: string | undefined): string | null {
  const cleaned = (q ?? "").replace(/[%_,().*\\]/g, " ").trim();
  return cleaned ? `%${cleaned}%` : null;
}
