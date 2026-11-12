import Link from "next/link";
import { ActionForm, FieldError, Submit } from "@/components/form";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { createPersonAndLink, updatePerson } from "@/lib/actions/contacts";
import { PERSON_ROLES } from "@/lib/options";

type Prefill = { full_name?: string | null; phone?: string | null; email?: string | null };

export function PersonForm({ companyId, prefill }: { companyId: number; prefill?: Prefill }) {
  return (
    <ActionForm action={createPersonAndLink.bind(null, companyId)} className="panel">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <TextField name="full_name" label="Full name" defaultValue={prefill?.full_name} required />
        <SelectField name="role" label="Role" options={PERSON_ROLES} defaultValue="promoter" />
        <TextField name="phone" label="Phone" inputMode="tel" defaultValue={prefill?.phone} />
        <TextField name="email" label="Email" type="email" defaultValue={prefill?.email} />
        <TextArea name="note" label="Note" defaultValue={null} className="sm:col-span-2" />
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="is_primary" value="1" />
          Make this the primary contact for the company
        </label>
        <FieldError name="is_primary" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Submit>Add person</Submit>
        <Link href={`/companies/${companyId}`}>Cancel</Link>
      </div>
    </ActionForm>
  );
}

type Person = { id: number; full_name: string; phone: string | null; email: string | null; note: string | null };

export function PersonEditForm({ person }: { person: Person }) {
  return (
    <ActionForm action={updatePerson.bind(null, person.id)} className="panel">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <TextField name="full_name" label="Full name" defaultValue={person.full_name} required />
        <TextField name="phone" label="Phone" inputMode="tel" defaultValue={person.phone} />
        <TextField name="email" label="Email" type="email" defaultValue={person.email} />
        <TextArea name="note" label="Note" defaultValue={person.note} className="sm:col-span-2" />
      </div>
      <div className="mt-5">
        <Submit>Save person</Submit>
      </div>
    </ActionForm>
  );
}
