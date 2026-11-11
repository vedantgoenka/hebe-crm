import Link from "next/link";
import { ActionForm, Submit } from "@/components/form";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { saveCompany } from "@/lib/actions/clients";
import { CONSTITUTIONS } from "@/lib/options";

type Company = {
  id: number; name: string; constitution: string | null; gstin: string | null; pan: string | null; cin: string | null;
  udyam_number: string | null; industry: string | null; address: string | null; district: string | null; notes: string | null;
};

export function CompanyForm({ clientId, company }: { clientId: number; company?: Company }) {
  return (
    <ActionForm action={saveCompany.bind(null, clientId, company?.id ?? null)} className="panel">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <TextField name="name" label="Company name" defaultValue={company?.name} required className="sm:col-span-2" />
        <SelectField name="constitution" label="Type of business" emptyLabel="Select" options={CONSTITUTIONS} defaultValue={company?.constitution} />
        <TextField name="industry" label="Industry" hint="e.g. food processing, cold storage" defaultValue={company?.industry} />
        <TextField name="gstin" label="GSTIN" defaultValue={company?.gstin} maxLength={15} upper />
        <TextField name="pan" label="Company PAN" defaultValue={company?.pan} maxLength={10} upper />
        <TextField name="cin" label="CIN / LLPIN" defaultValue={company?.cin} maxLength={21} upper />
        <TextField name="udyam_number" label="Udyam registration" defaultValue={company?.udyam_number} upper />
        <TextArea name="address" label="Unit address" rows={2} defaultValue={company?.address} className="sm:col-span-2" />
        <TextField name="district" label="District" defaultValue={company?.district} />
        <TextArea name="notes" label="Notes" defaultValue={company?.notes} className="sm:col-span-2" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Submit>{company ? "Save company" : "Add company"}</Submit>
        <Link href={`/clients/${clientId}`}>Cancel</Link>
      </div>
    </ActionForm>
  );
}
