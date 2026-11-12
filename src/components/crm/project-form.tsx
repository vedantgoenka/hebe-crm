import Link from "next/link";
import { ActionForm, Submit } from "@/components/form";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { saveProject } from "@/lib/actions/projects";
import { getActiveStaff, getServiceTypes, staffOptions } from "@/lib/data";

type Project = {
  id: number; title: string; service_type_id: number | null; govt_reference_no: string | null;
  assigned_to: string | null; start_date: string | null; notes: string | null;
};

export async function ProjectForm({ companyId, project }: { companyId: number; project?: Project }) {
  const [staff, services] = await Promise.all([getActiveStaff(), getServiceTypes()]);

  return (
    <ActionForm action={saveProject.bind(null, companyId, project?.id ?? null)} className="panel">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <TextField name="title" label="Project title" defaultValue={project?.title} required className="sm:col-span-2" />
        <TextField name="govt_reference_no" label="Government reference no." hint="SIPB application number or BIADA allotment letter" defaultValue={project?.govt_reference_no} upper />
        <SelectField
          name="service_type_id" label="Service type" emptyLabel="Not sure yet"
          options={services.map((s) => ({ value: String(s.id), label: s.name }))} defaultValue={project?.service_type_id}
        />
        <SelectField name="assigned_to" label="Assigned to" emptyLabel="Unassigned" options={staffOptions(staff)} defaultValue={project?.assigned_to} />
        <TextField name="start_date" label="Start date" type="date" defaultValue={project?.start_date} />
        <TextArea name="notes" label="Notes" defaultValue={project?.notes} className="sm:col-span-2" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Submit>{project ? "Save project" : "Add project"}</Submit>
        <Link href={project ? `/projects/${project.id}` : `/companies/${companyId}`}>Cancel</Link>
      </div>
    </ActionForm>
  );
}
