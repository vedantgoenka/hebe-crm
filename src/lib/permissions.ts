export const ASSIGNABLE_PERMISSIONS = {
  "leads.view": "See leads",
  "leads.manage": "Add and edit leads",
  "clients.view": "See clients and companies",
  "clients.manage": "Add and edit clients and companies",
  "projects.view": "See projects",
  "projects.manage": "Add and edit projects",
  "documents.view": "See documents",
  "documents.restricted": "See restricted documents (PAN, Aadhaar, bank statements)",
  "reports.view": "See team reports on the dashboard",
} as const;

/** Held only by the single Master Admin. The database refuses to put these on a role. */
export const MASTER_ONLY_PERMISSIONS = {
  "fees.view": "See fees and payments",
  "fees.manage": "Record fees and payments",
  "data.delete": "Archive records",
  "data.export": "Export data",
  "admin.users": "Manage employees and roles",
  "admin.settings": "Change system settings",
} as const;

export type AssignablePermission = keyof typeof ASSIGNABLE_PERMISSIONS;
export type Permission = AssignablePermission | keyof typeof MASTER_ONLY_PERMISSIONS;
