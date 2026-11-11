import Link from "next/link";
import { ActionForm, Submit } from "@/components/form";
import { SelectField, TextField } from "@/components/fields";
import { createEmployee, updateEmployee } from "@/lib/actions/admin";

type Employee = { id: string; full_name: string; username: string; phone: string | null; role_id: number | null; is_master_admin: boolean };

export function EmployeeForm({ employee, roles }: { employee?: Employee; roles: { id: number; name: string }[] }) {
  const action = employee ? updateEmployee.bind(null, employee.id) : createEmployee;
  return (
    <ActionForm action={action} className="panel max-w-3xl">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <TextField name="full_name" label="Full name" defaultValue={employee?.full_name} required />
        {employee ? (
          <div>
            <span className="label">Username</span>
            <p className="py-2">{employee.username}</p>
          </div>
        ) : (
          <TextField name="username" label="Username" hint="Lowercase, e.g. amit or sunny.k" autoComplete="off" required />
        )}
        <TextField name="phone" label="Phone" inputMode="tel" defaultValue={employee?.phone} />
        {!employee?.is_master_admin && (
          <SelectField
            name="role_id" label="Role" hint="Decides what they can see and do" emptyLabel="Select a role"
            options={roles.map((r) => ({ value: String(r.id), label: r.name }))} defaultValue={employee?.role_id}
          />
        )}
        <TextField
          name="password" label={employee ? "New password" : "Password"}
          hint={employee ? "Leave blank to keep the current one" : "8+ characters, letters and numbers"}
          type="text" autoComplete="new-password" required={!employee}
        />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Submit>{employee ? "Save employee" : "Create employee"}</Submit>
        <Link href="/admin/employees">Cancel</Link>
      </div>
    </ActionForm>
  );
}
