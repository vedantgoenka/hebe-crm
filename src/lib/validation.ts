import { z } from "zod";
import { ACTIVITY_TYPES, CONSTITUTIONS, LEAD_SOURCES, LEAD_STATUSES, keys } from "@/lib/options";
import { date, email, gstin, optionalId, pan, text, uuid } from "@/lib/forms";
import { ASSIGNABLE_PERMISSIONS } from "@/lib/permissions";

const required = (what: string, max = 255) => z.string({ error: `Enter ${what}.` }).min(1, `Enter ${what}.`).max(max);

export const leadSchema = z
  .object({
    name: required("the person's name"),
    phone: text(20),
    email,
    company_name: text(),
    city: text(100),
    state: text(100),
    source: z.enum(keys(LEAD_SOURCES)),
    referred_by: text(),
    service_type_id: optionalId,
    requirement: text(5000),
    // Left out of the form for converted leads, so their status can't be changed by an edit.
    status: z.enum(keys(LEAD_STATUSES)).refine((s) => s !== "converted", "Use “Convert to client” on the lead page.").optional(),
    lost_reason: text(),
    assigned_to: uuid,
    next_follow_up_on: date,
  })
  .refine((d) => d.status !== "lost" || d.lost_reason, { path: ["lost_reason"], message: "Say why the lead was lost." });

export const clientSchema = z.object({
  name: required("the client's name"),
  phone: text(20),
  alt_phone: text(20),
  email,
  address: text(1000),
  city: text(100),
  state: text(100),
  pan,
  source: z.enum(keys(LEAD_SOURCES)).nullable(),
  referred_by: text(),
  relationship_owner: uuid,
  notes: text(5000),
});

export const companySchema = z.object({
  name: required("the company name"),
  constitution: z.enum(keys(CONSTITUTIONS)).nullable(),
  gstin,
  pan,
  cin: text(21).transform((v) => v?.toUpperCase() ?? null),
  udyam_number: text(30).transform((v) => v?.toUpperCase() ?? null),
  industry: text(),
  address: text(1000),
  district: text(100),
  notes: text(5000),
});

export const activitySchema = z.object({
  type: z.enum(keys(ACTIVITY_TYPES)),
  summary: required("what was discussed", 5000),
  occurred_at: z.string().nullable(),
});

export const taskSchema = z.object({
  title: required("the follow-up", 255),
  assigned_to: z.uuid("Choose who it is for."),
  due_on: date,
});

const password = z
  .string({ error: "Enter a password." })
  .min(8, "Use at least 8 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const staffCreateSchema = z.object({
  full_name: required("the full name"),
  username: z
    .string({ error: "Enter a username." })
    .regex(/^[a-z0-9._-]{3,40}$/, "Use 3–40 lowercase letters, numbers, dots, dashes or underscores."),
  phone: text(20),
  role_id: z.coerce.number({ error: "Choose a role." }).int().positive("Choose a role."),
  password,
});

export const staffUpdateSchema = staffCreateSchema
  .omit({ username: true, password: true })
  .extend({ role_id: z.coerce.number().int().positive().nullable(), password: password.nullable() });

export const roleSchema = z.object({
  name: required("a role name", 100),
  description: text(),
  permissions: z.array(z.enum(keys(ASSIGNABLE_PERMISSIONS))).default([]),
});

export const passwordChangeSchema = z
  .object({
    current_password: z.string({ error: "Enter your current password." }).min(1, "Enter your current password."),
    password,
    password_confirmation: z.string().nullable(),
  })
  .refine((d) => d.password === d.password_confirmation, { path: ["password_confirmation"], message: "The two passwords don't match." });
