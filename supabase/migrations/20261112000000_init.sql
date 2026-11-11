-- HEBE CRM, initial schema (Build 1)
-- Rules: nothing is ever hard-deleted from the app (no DELETE policies exist),
-- records are archived with archived_at, and every change is written to audit_log.

-------------------------------------------------------------------------------
-- Permissions
-------------------------------------------------------------------------------
create table public.roles (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  description text,
  permissions text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Roles can only hold assignable permissions; master-only ones can never be granted.
  constraint roles_assignable_only check (permissions <@ array[
    'leads.view','leads.manage','clients.view','clients.manage',
    'projects.view','projects.manage','documents.view','documents.restricted','reports.view'
  ]::text[])
);

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete restrict,
  full_name       text not null,
  username        text not null unique check (username ~ '^[a-z0-9._-]{3,40}$'),
  phone           text,
  role_id         bigint references public.roles (id) on delete set null,
  is_master_admin boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Exactly one Master Admin.
create unique index profiles_single_master on public.profiles (is_master_admin) where is_master_admin;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$$;

create or replace function public.has_perm(perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    left join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and p.is_active
      and (p.is_master_admin or perm = any (r.permissions))
  );
$$;

-------------------------------------------------------------------------------
-- Shared triggers
-------------------------------------------------------------------------------
create or replace function public.stamp_row()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    if new.archived_at is distinct from old.archived_at
       and auth.uid() is not null
       and not public.has_perm('data.delete') then
      raise exception 'Only the Master Admin can archive or restore records';
    end if;
  end if;
  return new;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  row_id     text,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  actor      uuid,
  created_at timestamptz not null default now()
);
create index audit_log_row on public.audit_log (table_name, row_id);

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_action text := lower(tg_op);
begin
  if tg_op = 'UPDATE' and v_old ? 'archived_at' and (v_old->>'archived_at') is distinct from (v_new->>'archived_at') then
    v_action := case when v_new->>'archived_at' is null then 'restore' else 'archive' end;
  end if;
  insert into public.audit_log (table_name, row_id, action, old_data, new_data, actor)
  values (tg_table_name, coalesce(v_new->>'id', v_old->>'id'), v_action, v_old, v_new, auth.uid());
  return null;
end $$;

-------------------------------------------------------------------------------
-- Reference data (editable by the admin later)
-------------------------------------------------------------------------------
create table public.service_types (
  id          bigint generated always as identity primary key,
  code        text not null unique,
  name        text not null,
  description text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.stages (
  id              bigint generated always as identity primary key,
  service_type_id bigint not null references public.service_types (id) on delete restrict,
  name            text not null,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-------------------------------------------------------------------------------
-- Clients, companies, leads
-------------------------------------------------------------------------------
create table public.clients (
  id                 bigint generated always as identity primary key,
  name               text not null,
  phone              text,
  alt_phone          text,
  email              text,
  address            text,
  city               text,
  state              text,
  is_outside_bihar   boolean generated always as (coalesce(nullif(lower(trim(state)), ''), 'bihar') <> 'bihar') stored,
  pan                text check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  source             text check (source in ('referral','repeat','walk_in','phone','website','social_media','bank','other')),
  referred_by        text,
  relationship_owner uuid references public.profiles (id),
  notes              text,
  created_by         uuid references public.profiles (id),
  updated_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  archived_at        timestamptz
);
create index clients_name on public.clients (lower(name));
create index clients_phone on public.clients (phone);

create table public.companies (
  id           bigint generated always as identity primary key,
  client_id    bigint not null references public.clients (id) on delete restrict,
  name         text not null,
  constitution text check (constitution in ('proprietorship','partnership','llp','private_ltd','public_ltd','other')),
  gstin        text check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$'),
  pan          text check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  cin          text,
  udyam_number text,
  industry     text,
  address      text,
  district     text,
  notes        text,
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);
create index companies_client on public.companies (client_id);

create table public.leads (
  id                  bigint generated always as identity primary key,
  name                text not null,
  phone               text,
  email               text,
  company_name        text,
  city                text,
  state               text,
  is_outside_bihar    boolean generated always as (coalesce(nullif(lower(trim(state)), ''), 'bihar') <> 'bihar') stored,
  source              text not null default 'referral' check (source in ('referral','repeat','walk_in','phone','website','social_media','bank','other')),
  referred_by         text,
  service_type_id     bigint references public.service_types (id),
  requirement         text,
  status              text not null default 'new' check (status in ('new','contacted','meeting_scheduled','meeting_done','converted','lost')),
  lost_reason         text,
  assigned_to         uuid references public.profiles (id),
  next_follow_up_on   date,
  converted_client_id bigint references public.clients (id),
  created_by          uuid references public.profiles (id),
  updated_by          uuid references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  archived_at         timestamptz,
  constraint leads_lost_needs_reason check (status <> 'lost' or nullif(trim(lost_reason), '') is not null),
  constraint leads_converted_needs_client check (status <> 'converted' or converted_client_id is not null)
);
create index leads_status on public.leads (status);
create index leads_assigned on public.leads (assigned_to, next_follow_up_on);

-------------------------------------------------------------------------------
-- Projects (screens arrive in Build 2)
-------------------------------------------------------------------------------
create table public.projects (
  id               bigint generated always as identity primary key,
  company_id       bigint not null references public.companies (id) on delete restrict,
  service_type_id  bigint not null references public.service_types (id),
  title            text not null,
  current_stage_id bigint references public.stages (id),
  status           text not null default 'active' check (status in ('active','on_hold','completed','cancelled')),
  project_cost     numeric(15,2),
  loan_amount      numeric(15,2),
  bank_name        text,
  assigned_to      uuid references public.profiles (id),
  start_date       date,
  target_date      date,
  completed_on     date,
  notes            text,
  created_by       uuid references public.profiles (id),
  updated_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz
);
create index projects_company on public.projects (company_id);

-------------------------------------------------------------------------------
-- Follow-ups and the call / meeting log
-------------------------------------------------------------------------------
create table public.tasks (
  id           bigint generated always as identity primary key,
  title        text not null,
  description  text,
  lead_id      bigint references public.leads (id),
  client_id    bigint references public.clients (id),
  project_id   bigint references public.projects (id),
  assigned_to  uuid not null references public.profiles (id),
  due_on       date,
  status       text not null default 'open' check (status in ('open','done')),
  completed_at timestamptz,
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);
create index tasks_assigned on public.tasks (assigned_to, status, due_on);

create table public.activities (
  id          bigint generated always as identity primary key,
  lead_id     bigint references public.leads (id),
  client_id   bigint references public.clients (id),
  project_id  bigint references public.projects (id),
  type        text not null check (type in ('call','meeting','whatsapp','email','visit','note')),
  summary     text not null,
  occurred_at timestamptz not null default now(),
  created_by  uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now(),
  constraint activities_one_subject check (num_nonnulls(lead_id, client_id, project_id) = 1)
);
create index activities_lead on public.activities (lead_id, occurred_at desc);
create index activities_client on public.activities (client_id, occurred_at desc);

-------------------------------------------------------------------------------
-- Documents, fees, subsidies (screens arrive in Build 2)
-------------------------------------------------------------------------------
create table public.documents (
  id            bigint generated always as identity primary key,
  client_id     bigint references public.clients (id),
  company_id    bigint references public.companies (id),
  project_id    bigint references public.projects (id),
  category      text not null,
  title         text not null,
  storage_path  text not null,
  original_name text not null,
  mime_type     text,
  size_bytes    bigint not null default 0,
  expires_on    date,
  is_restricted boolean not null default false,
  created_by    uuid references public.profiles (id),
  updated_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz,
  constraint documents_one_owner check (num_nonnulls(client_id, company_id, project_id) = 1)
);

create table public.fee_templates (
  id              bigint generated always as identity primary key,
  service_type_id bigint not null references public.service_types (id),
  stage_id        bigint references public.stages (id),
  label           text not null,
  amount          numeric(12,2) not null default 0,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.fee_instalments (
  id               bigint generated always as identity primary key,
  project_id       bigint not null references public.projects (id) on delete restrict,
  stage_id         bigint references public.stages (id),
  label            text not null,
  amount           numeric(12,2) not null,
  status           text not null default 'pending' check (status in ('pending','due','paid','waived')),
  due_on           date,
  paid_on          date,
  tally_invoice_no text,
  notes            text,
  created_by       uuid references public.profiles (id),
  updated_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz
);

create table public.subsidy_schemes (
  id                 bigint generated always as identity primary key,
  name               text not null,
  description        text,
  stages             text[] not null default '{}',
  required_documents text,
  deadline_rule      text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.project_subsidies (
  id                bigint generated always as identity primary key,
  project_id        bigint not null references public.projects (id) on delete restrict,
  subsidy_scheme_id bigint not null references public.subsidy_schemes (id),
  status            text not null default 'eligible' check (status in ('eligible','applied','in_review','approved','received','rejected')),
  current_stage     text,
  next_deadline_on  date,
  amount_claimed    numeric(15,2),
  amount_received   numeric(15,2),
  notes             text,
  created_by        uuid references public.profiles (id),
  updated_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz
);

-------------------------------------------------------------------------------
-- Attach triggers
-------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clients','companies','leads','projects','tasks','documents','fee_instalments','project_subsidies'] loop
    execute format('create trigger stamp before insert or update on public.%I for each row execute function public.stamp_row()', t);
  end loop;

  foreach t in array array['roles','profiles','service_types','stages','fee_templates','subsidy_schemes'] loop
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;

  foreach t in array array['roles','profiles','service_types','stages','clients','companies','leads','projects',
                           'tasks','activities','documents','fee_templates','fee_instalments','subsidy_schemes','project_subsidies'] loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
  end loop;
end $$;

-------------------------------------------------------------------------------
-- Row level security. No DELETE policy exists on any table.
-------------------------------------------------------------------------------
alter table public.roles             enable row level security;
alter table public.profiles          enable row level security;
alter table public.audit_log         enable row level security;
alter table public.service_types     enable row level security;
alter table public.stages            enable row level security;
alter table public.clients           enable row level security;
alter table public.companies         enable row level security;
alter table public.leads             enable row level security;
alter table public.projects          enable row level security;
alter table public.tasks             enable row level security;
alter table public.activities        enable row level security;
alter table public.documents         enable row level security;
alter table public.fee_templates     enable row level security;
alter table public.fee_instalments   enable row level security;
alter table public.subsidy_schemes   enable row level security;
alter table public.project_subsidies enable row level security;

-- Staff directory and roles: readable by all staff. Profiles change only through
-- the server (admin actions use the secret key), so there are no write policies.
create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff());
create policy "staff read roles"    on public.roles    for select to authenticated using (public.is_staff());
create policy "admin writes roles"  on public.roles    for insert to authenticated with check (public.has_perm('admin.users'));
create policy "admin updates roles" on public.roles    for update to authenticated using (public.has_perm('admin.users')) with check (public.has_perm('admin.users'));

create policy "admin reads audit" on public.audit_log for select to authenticated using (public.has_perm('admin.users'));

create policy "staff read services" on public.service_types for select to authenticated using (public.is_staff());
create policy "admin writes services" on public.service_types for insert to authenticated with check (public.has_perm('admin.settings'));
create policy "admin updates services" on public.service_types for update to authenticated using (public.has_perm('admin.settings')) with check (public.has_perm('admin.settings'));
create policy "staff read stages" on public.stages for select to authenticated using (public.is_staff());
create policy "admin writes stages" on public.stages for insert to authenticated with check (public.has_perm('admin.settings'));
create policy "admin updates stages" on public.stages for update to authenticated using (public.has_perm('admin.settings')) with check (public.has_perm('admin.settings'));

-- Archived rows are visible only to the Master Admin (data.delete), so they can be restored.
create policy "read leads" on public.leads for select to authenticated
  using (public.has_perm('leads.view') and (archived_at is null or public.has_perm('data.delete')));
create policy "add leads" on public.leads for insert to authenticated with check (public.has_perm('leads.manage'));
create policy "edit leads" on public.leads for update to authenticated
  using (public.has_perm('leads.manage')) with check (public.has_perm('leads.manage'));

create policy "read clients" on public.clients for select to authenticated
  using (public.has_perm('clients.view') and (archived_at is null or public.has_perm('data.delete')));
create policy "add clients" on public.clients for insert to authenticated with check (public.has_perm('clients.manage'));
create policy "edit clients" on public.clients for update to authenticated
  using (public.has_perm('clients.manage')) with check (public.has_perm('clients.manage'));

create policy "read companies" on public.companies for select to authenticated
  using (public.has_perm('clients.view') and (archived_at is null or public.has_perm('data.delete')));
create policy "add companies" on public.companies for insert to authenticated with check (public.has_perm('clients.manage'));
create policy "edit companies" on public.companies for update to authenticated
  using (public.has_perm('clients.manage')) with check (public.has_perm('clients.manage'));

create policy "read projects" on public.projects for select to authenticated
  using (public.has_perm('projects.view') and (archived_at is null or public.has_perm('data.delete')));
create policy "add projects" on public.projects for insert to authenticated with check (public.has_perm('projects.manage'));
create policy "edit projects" on public.projects for update to authenticated
  using (public.has_perm('projects.manage')) with check (public.has_perm('projects.manage'));

create policy "read tasks" on public.tasks for select to authenticated
  using (public.is_staff() and (archived_at is null or public.has_perm('data.delete')));
create policy "add tasks" on public.tasks for insert to authenticated
  with check (public.has_perm('leads.manage') or public.has_perm('clients.manage') or public.has_perm('projects.manage'));
create policy "edit tasks" on public.tasks for update to authenticated
  using (assigned_to = auth.uid() or public.has_perm('leads.manage') or public.has_perm('clients.manage'))
  with check (public.is_staff());

create policy "read activities" on public.activities for select to authenticated using (public.is_staff());
create policy "log activities" on public.activities for insert to authenticated
  with check (
    created_by = auth.uid()
    and (lead_id is null or public.has_perm('leads.manage'))
    and (client_id is null or public.has_perm('clients.manage'))
    and (project_id is null or public.has_perm('projects.manage'))
  );

create policy "read documents" on public.documents for select to authenticated
  using (public.has_perm('documents.view')
         and (not is_restricted or public.has_perm('documents.restricted'))
         and (archived_at is null or public.has_perm('data.delete')));
create policy "add documents" on public.documents for insert to authenticated
  with check (public.has_perm('clients.manage') or public.has_perm('projects.manage'));
create policy "edit documents" on public.documents for update to authenticated
  using (public.has_perm('clients.manage') or public.has_perm('projects.manage')) with check (public.is_staff());

create policy "fees read templates" on public.fee_templates for select to authenticated using (public.has_perm('fees.view'));
create policy "fees add templates" on public.fee_templates for insert to authenticated with check (public.has_perm('fees.manage'));
create policy "fees edit templates" on public.fee_templates for update to authenticated using (public.has_perm('fees.manage')) with check (public.has_perm('fees.manage'));
create policy "fees read" on public.fee_instalments for select to authenticated using (public.has_perm('fees.view'));
create policy "fees add" on public.fee_instalments for insert to authenticated with check (public.has_perm('fees.manage'));
create policy "fees edit" on public.fee_instalments for update to authenticated using (public.has_perm('fees.manage')) with check (public.has_perm('fees.manage'));

create policy "staff read schemes" on public.subsidy_schemes for select to authenticated using (public.is_staff());
create policy "admin add schemes" on public.subsidy_schemes for insert to authenticated with check (public.has_perm('admin.settings'));
create policy "admin edit schemes" on public.subsidy_schemes for update to authenticated using (public.has_perm('admin.settings')) with check (public.has_perm('admin.settings'));

create policy "read project subsidies" on public.project_subsidies for select to authenticated
  using (public.has_perm('projects.view') and (archived_at is null or public.has_perm('data.delete')));
create policy "add project subsidies" on public.project_subsidies for insert to authenticated with check (public.has_perm('projects.manage'));
create policy "edit project subsidies" on public.project_subsidies for update to authenticated
  using (public.has_perm('projects.manage')) with check (public.has_perm('projects.manage'));

-- Extra safety: the public API roles cannot delete anything at all.
revoke delete on all tables in schema public from anon, authenticated;
revoke all on public.audit_log from anon;
alter default privileges in schema public revoke delete on tables from anon, authenticated;

-------------------------------------------------------------------------------
-- Convert a lead into a client (and company) in one transaction
-------------------------------------------------------------------------------
create or replace function public.convert_lead(p_lead_id bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare
  l   public.leads;
  cid bigint;
begin
  if not (public.has_perm('clients.manage') and public.has_perm('leads.manage')) then
    raise exception 'You do not have permission to convert leads';
  end if;

  select * into l from public.leads where id = p_lead_id and archived_at is null for update;
  if not found then
    raise exception 'Lead not found';
  end if;
  if l.converted_client_id is not null then
    return l.converted_client_id;
  end if;
  if l.status = 'lost' then
    raise exception 'A lost lead cannot be converted. Change its status first.';
  end if;

  insert into public.clients (name, phone, email, city, state, source, referred_by, relationship_owner, notes)
  values (l.name, l.phone, l.email, l.city, l.state, l.source, l.referred_by, l.assigned_to, l.requirement)
  returning id into cid;

  if nullif(trim(l.company_name), '') is not null then
    insert into public.companies (client_id, name) values (cid, trim(l.company_name));
  end if;

  update public.leads set status = 'converted', converted_client_id = cid where id = p_lead_id;
  return cid;
end $$;

-------------------------------------------------------------------------------
-- Starter data (safe to re-run: only adds what is missing)
-------------------------------------------------------------------------------
insert into public.roles (name, description, permissions) values
  ('Project Head', 'Leads projects and client relationships',
   array['leads.view','leads.manage','clients.view','clients.manage','projects.view','projects.manage','documents.view','documents.restricted','reports.view']),
  ('Relationship Manager', 'Day-to-day client contact',
   array['leads.view','leads.manage','clients.view','clients.manage','projects.view','projects.manage','documents.view','documents.restricted']),
  ('Marketing', 'Lead generation and follow-up',
   array['leads.view','leads.manage','clients.view','projects.view']),
  ('Project Support', 'Prepares DPRs, reports and filings',
   array['leads.view','leads.manage','clients.view','clients.manage','projects.view','projects.manage','documents.view'])
on conflict (name) do nothing;

insert into public.service_types (code, name, sort_order) values
  ('land',      'Land allotment (BIADA)', 1),
  ('dpr',       'DPR / project report', 2),
  ('finance',   'Bank finance (term loan / working capital)', 3),
  ('approvals', 'Approvals and licences', 4),
  ('subsidy',   'Subsidy claim', 5),
  ('expansion', 'Expansion / modernisation', 6)
on conflict (code) do nothing;

insert into public.stages (service_type_id, name, sort_order)
select s.id, x.name, x.ord
from public.service_types s
join (values
  ('land', 'Requirement and site shortlisting', 1), ('land', 'Application filed', 2), ('land', 'Project clearance committee', 3), ('land', 'Allotment letter', 4), ('land', 'Possession', 5),
  ('dpr', 'Data collection', 1), ('dpr', 'Draft DPR', 2), ('dpr', 'Client review', 3), ('dpr', 'Final DPR issued', 4),
  ('finance', 'Bank selection', 1), ('finance', 'Proposal submitted', 2), ('finance', 'Bank queries', 3), ('finance', 'Sanction', 4), ('finance', 'Disbursement', 5),
  ('approvals', 'Documents collected', 1), ('approvals', 'Applications filed', 2), ('approvals', 'Inspections', 3), ('approvals', 'Approvals received', 4),
  ('subsidy', 'Eligibility check', 1), ('subsidy', 'Registration', 2), ('subsidy', 'Claim filed', 3), ('subsidy', 'Verification', 4), ('subsidy', 'Subsidy received', 5),
  ('expansion', 'Requirement', 1), ('expansion', 'Report prepared', 2), ('expansion', 'Finance arranged', 3), ('expansion', 'Completed', 4)
) as x(code, name, ord) on x.code = s.code
where not exists (select 1 from public.stages st where st.service_type_id = s.id);
