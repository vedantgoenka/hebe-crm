import { z } from "zod";

export type FormState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined>; ok?: string }
  | undefined;

/** Reads a form into a plain object, turning empty text into null. */
export function formObject(formData: FormData): Record<string, string | string[] | null> {
  const out: Record<string, string | string[] | null> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key).filter((v): v is string => typeof v === "string");
    if (key.endsWith("[]")) {
      out[key.slice(0, -2)] = all;
    } else {
      const v = (all[0] ?? "").trim();
      out[key] = v === "" ? null : v;
    }
  }
  return out;
}

export function invalid(error: z.ZodError): FormState {
  return { error: "Some details need fixing.", fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> };
}

/** Turns database errors into plain messages. */
export function dbError(error: { message: string; code?: string } | null): FormState {
  if (!error) return { error: "Something went wrong. Try again." };
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return { error: "You don't have permission to do that. Ask the admin." };
  }
  if (error.code === "23505") return { error: "That already exists." };
  if (error.code === "23514") return { error: "Some details are in the wrong format. Check PAN and GSTIN." };
  return { error: error.message };
}

const text = (max = 255) => z.string().max(max).nullable();

export const pan = z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, "PAN should look like ABCDE1234F.").transform((v) => v.toUpperCase()).nullable();
export const gstin = z
  .string()
  .regex(/^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]{3}$/, "GSTIN should be 15 characters, like 10ABCDE1234F1Z5.")
  .transform((v) => v.toUpperCase())
  .nullable();
export const email = z.email("Enter a valid email.").nullable();
export const date = z.iso.date("Enter a valid date.").nullable();
export const id = z.coerce.number().int().positive();
export const optionalId = z.coerce.number().int().positive().nullable();
export const uuid = z.uuid().nullable();

export { text };
