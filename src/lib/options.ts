export const LEAD_SOURCES = {
  referral: "Referral",
  repeat: "Existing client (repeat work)",
  walk_in: "Walk-in",
  phone: "Phone enquiry",
  website: "Website",
  social_media: "Social media",
  bank: "Bank or partner",
  biada_pcc: "BIADA PCC list",
  sipb_list: "SIPB list",
  other: "Other",
} as const;

/** Order matters: it drives the journey line on the lead page. */
export const LEAD_STATUSES = {
  new: "New",
  contacted: "Contacted",
  meeting_scheduled: "Meeting scheduled",
  meeting_done: "Meeting done",
  converted: "Converted to client",
  lost: "Lost",
} as const;

export const ACTIVITY_TYPES = {
  call: "Phone call",
  meeting: "Meeting",
  whatsapp: "WhatsApp",
  email: "Email",
  visit: "Site or office visit",
  note: "Note",
} as const;

export const CONSTITUTIONS = {
  proprietorship: "Proprietorship",
  partnership: "Partnership",
  llp: "LLP",
  private_ltd: "Private Limited",
  public_ltd: "Public Limited",
  other: "Other",
} as const;

export const PERSON_ROLES = {
  promoter: "Promoter",
  director: "Director",
  partner: "Partner",
  authorised_signatory: "Authorised signatory",
  accountant: "Accountant",
  other: "Other",
} as const;

export const STAGE_STATUSES = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
  not_needed: "Not needed",
} as const;

export const CHECKLIST_STATUSES = {
  missing: "Missing",
  received: "Received",
  not_needed: "Not needed",
} as const;

export type LeadStatus = keyof typeof LEAD_STATUSES;
export type LeadSource = keyof typeof LEAD_SOURCES;
export type StageStatus = keyof typeof STAGE_STATUSES;

export function label<T extends Record<string, string>>(map: T, key: string | null | undefined, fallback = "—"): string {
  return key && key in map ? map[key as keyof T] : fallback;
}

export function keys<T extends Record<string, string>>(map: T) {
  return Object.keys(map) as [keyof T & string, ...(keyof T & string)[]];
}
