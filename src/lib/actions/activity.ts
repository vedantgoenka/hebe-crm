"use server";

import { revalidatePath } from "next/cache";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid, type FormState } from "@/lib/forms";
import { activitySchema, taskSchema } from "@/lib/validation";

export type Subject = { kind: "lead" | "client"; id: number };

function pathFor(subject: Subject) {
  return subject.kind === "lead" ? `/leads/${subject.id}` : `/clients/${subject.id}`;
}

export async function logActivity(subject: Subject, _: FormState, formData: FormData): Promise<FormState> {
  const staff = await getStaff();
  const parsed = activitySchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const occurred = parsed.data.occurred_at ? new Date(`${parsed.data.occurred_at}:00+05:30`) : new Date();
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    [`${subject.kind}_id`]: subject.id,
    type: parsed.data.type,
    summary: parsed.data.summary,
    occurred_at: Number.isNaN(occurred.getTime()) ? new Date().toISOString() : occurred.toISOString(),
    created_by: staff.id,
  });
  if (error) return dbError(error);

  revalidatePath(pathFor(subject));
  return { ok: "Logged." };
}

export async function addTask(subject: Subject, _: FormState, formData: FormData): Promise<FormState> {
  await getStaff();
  const parsed = taskSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ ...parsed.data, [`${subject.kind}_id`]: subject.id });
  if (error) return dbError(error);

  revalidatePath(pathFor(subject));
  revalidatePath("/");
  return { ok: "Follow-up added." };
}

export async function completeTask(taskId: number, path: string): Promise<FormState> {
  await getStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", taskId);
  if (error) return dbError(error);
  revalidatePath(path);
  revalidatePath("/");
  return undefined;
}
