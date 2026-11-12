-- One-time data fix: contact names recovered from the BIADA PCC / SIPB government
-- documents, for two leads imported with no named person (name equalled company_name).
-- Run once in the Supabase SQL Editor. Safe to re-run: each update only touches a lead
-- whose name still equals its company_name, so a manual edit made afterwards (to either
-- the name or the company name) is never overwritten, and a second run is a no-op.

update public.leads
set
  name = 'Ashok Kumar',
  requirement = case
    when coalesce(trim(requirement), '') = '' then 'Other director: Soyam Kumar.'
    else requirement || chr(10) || 'Other director: Soyam Kumar.'
  end
where lower(trim(company_name)) = lower(trim('RSCS International'))
  and lower(trim(name)) = lower(trim(company_name));

update public.leads
set
  name = 'Lalbabu Prasad',
  requirement = case
    when coalesce(trim(requirement), '') = '' then 'Director.'
    else requirement || chr(10) || 'Director.'
  end
where lower(trim(company_name)) = lower(trim('Om Sairam Agro Private Limited'))
  and lower(trim(name)) = lower(trim(company_name));
