import { ActionForm, Submit } from "@/components/form";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { saveLead } from "@/lib/actions/leads";
import { getActiveStaff, getServiceTypes, staffOptions } from "@/lib/data";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/options";
import Link from "next/link";

type Lead = {
  id: number; name: string; phone: string | null; email: string | null; company_name: string | null;
  city: string | null; state: string | null; source: string; referred_by: string | null;
  service_type_id: number | null; requirement: string | null; status: string; lost_reason: string | null;
  assigned_to: string | null; next_follow_up_on: string | null;
};

export async function LeadForm({ lead, me }: { lead?: Lead; me: string }) {
  const [staff, services] = await Promise.all([getActiveStaff(), getServiceTypes()]);
  const statuses = Object.fromEntries(Object.entries(LEAD_STATUSES).filter(([k]) => k !== "converted"));

  return (
    <ActionForm action={saveLead.bind(null, lead?.id ?? null)} className="panel">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <TextField name="name" label="Person's name" defaultValue={lead?.name} required />
        <TextField name="company_name" label="Company name" hint="If they have one" defaultValue={lead?.company_name} />
        <TextField name="phone" label="Phone" inputMode="tel" defaultValue={lead?.phone} />
        <TextField name="email" label="Email" type="email" defaultValue={lead?.email} />
        <TextField name="city" label="City" defaultValue={lead?.city} />
        <TextField name="state" label="State" hint="Leads outside Bihar are flagged automatically" defaultValue={lead?.state ?? "Bihar"} />
        <SelectField name="source" label="How they found us" options={LEAD_SOURCES} defaultValue={lead?.source ?? "referral"} />
        <TextField name="referred_by" label="Referred by" hint="Name of the person or client" defaultValue={lead?.referred_by} />
        <SelectField
          name="service_type_id" label="Service they need" emptyLabel="Not sure yet"
          options={services.map((s) => ({ value: String(s.id), label: s.name }))} defaultValue={lead?.service_type_id}
        />
        <SelectField
          name="assigned_to" label="Assigned to" emptyLabel="Unassigned"
          options={staffOptions(staff)} defaultValue={lead ? lead.assigned_to : me}
        />
        <TextArea name="requirement" label="What they want" hint="Industry, project size, land, loan, subsidy" defaultValue={lead?.requirement} className="sm:col-span-2" />
        {lead?.status !== "converted" && (
          <SelectField name="status" label="Status" hint="To make them a client, use Convert on the lead page" options={statuses} defaultValue={lead?.status ?? "new"} />
        )}
        <TextField name="next_follow_up_on" label="Call back on" type="date" defaultValue={lead?.next_follow_up_on} />
        {lead?.status !== "converted" && (
          <TextField name="lost_reason" label="Reason lost" hint="Only if the status is Lost" defaultValue={lead?.lost_reason} className="sm:col-span-2" />
        )}
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Submit>{lead ? "Save lead" : "Add lead"}</Submit>
        <Link href={lead ? `/leads/${lead.id}` : "/leads"}>Cancel</Link>
      </div>
    </ActionForm>
  );
}
