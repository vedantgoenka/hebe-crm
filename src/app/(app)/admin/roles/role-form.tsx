import Link from "next/link";
import { ActionForm, FieldError, Submit } from "@/components/form";
import { TextField } from "@/components/fields";
import { saveRole } from "@/lib/actions/admin";
import { ASSIGNABLE_PERMISSIONS } from "@/lib/permissions";

type Role = { id: number; name: string; description: string | null; permissions: string[] };

export function RoleForm({ role }: { role?: Role }) {
  const chosen = new Set(role?.permissions ?? []);
  return (
    <ActionForm action={saveRole.bind(null, role?.id ?? null)} className="panel max-w-3xl">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <TextField name="name" label="Role name" defaultValue={role?.name} required />
        <TextField name="description" label="Description" defaultValue={role?.description} />
        <fieldset className="sm:col-span-2">
          <legend className="label">This role can</legend>
          <div className="mt-1 space-y-2">
            {Object.entries(ASSIGNABLE_PERMISSIONS).map(([key, text]) => (
              <label key={key} className="flex items-start gap-2">
                <input type="checkbox" name="permissions[]" value={key} defaultChecked={chosen.has(key)} className="mt-1" />
                {text}
              </label>
            ))}
          </div>
          <FieldError name="permissions" />
          <p className="mt-3 text-sm text-muted">Only the Master Admin can see fees, archive records, export data or manage employees.</p>
        </fieldset>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Submit>{role ? "Save role" : "Create role"}</Submit>
        <Link href="/admin/roles">Cancel</Link>
      </div>
    </ActionForm>
  );
}
