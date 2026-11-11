import Link from "next/link";
import { ActionForm, Submit } from "@/components/form";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { saveClient } from "@/lib/actions/clients";
import { getActiveStaff, staffOptions } from "@/lib/data";
import { LEAD_SOURCES } from "@/lib/options";

type Client = {
  id: number; name: string; phone: string | null; alt_phone: string | null; email: string | null; address: string | null;
  city: string | null; state: string | null; pan: string | null; source: string | null; referred_by: string | null;
  relationship_owner: string | null; notes: string | null;
};

export async function ClientForm({ client }: { client?: Client }) {
  const staff = await getActiveStaff();
  return (
    <ActionForm action={saveClient.bind(null, client?.id ?? null)} className="panel">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <TextField name="name" label="Client name" hint="The promoter or investor" defaultValue={client?.name} required />
        <TextField name="pan" label="Personal PAN" defaultValue={client?.pan} maxLength={10} upper />
        <TextField name="phone" label="Phone" inputMode="tel" defaultValue={client?.phone} />
        <TextField name="alt_phone" label="Other phone" inputMode="tel" defaultValue={client?.alt_phone} />
        <TextField name="email" label="Email" type="email" defaultValue={client?.email} />
        <SelectField name="relationship_owner" label="Relationship owner" emptyLabel="Not assigned" options={staffOptions(staff)} defaultValue={client?.relationship_owner} />
        <TextArea name="address" label="Address" rows={2} defaultValue={client?.address} className="sm:col-span-2" />
        <TextField name="city" label="City" defaultValue={client?.city} />
        <TextField name="state" label="State" defaultValue={client?.state ?? "Bihar"} />
        <SelectField name="source" label="How they found us" options={LEAD_SOURCES} defaultValue={client?.source ?? "referral"} />
        <TextField name="referred_by" label="Referred by" defaultValue={client?.referred_by} />
        <TextArea name="notes" label="Notes" defaultValue={client?.notes} className="sm:col-span-2" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Submit>{client ? "Save client" : "Add client"}</Submit>
        <Link href={client ? `/clients/${client.id}` : "/clients"}>Cancel</Link>
      </div>
    </ActionForm>
  );
}
