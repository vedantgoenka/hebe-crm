/** The person's name, or null if it's just a stand-in for the company name (common for BIADA PCC / SIPB imports with no named contact). */
export function contactPersonName(name: string, companyName: string | null): string | null {
  if (!companyName) return name;
  return name.trim().toLowerCase() === companyName.trim().toLowerCase() ? null : name;
}

export function LeadContact({ name, companyName, phone, email }: {
  name: string; companyName: string | null; phone: string | null; email: string | null;
}) {
  const person = contactPersonName(name, companyName);
  return (
    <div>
      {person && <div>{person}</div>}
      {phone && <div><a href={`tel:${phone}`}>{phone}</a></div>}
      {email && <div className="break-all"><a href={`mailto:${email}`}>{email}</a></div>}
      {!phone && !email && <div className="text-muted">Contact not available</div>}
    </div>
  );
}
