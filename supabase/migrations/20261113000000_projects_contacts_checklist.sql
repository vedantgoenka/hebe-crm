-- HEBE CRM — Build 2: client projects, stage tracking, contacts, document checklist.
-- Additive only. Does not touch fee_*, documents, or subsidy_* tables. Never edits
-- 20261112000000_init.sql. No table/column drops, no truncate, no delete.

-------------------------------------------------------------------------------
-- 1. New columns on existing tables
-------------------------------------------------------------------------------
alter table public.projects add column govt_reference_no text;
alter table public.leads add column opportunity_reason text;

-- Service type becomes optional on a project (the new 8-stage track replaces
-- per-service stage tracking, so a project no longer needs one to exist).
-- Relaxing a NOT NULL constraint loses no data, so this is not a destructive change.
alter table public.projects alter column service_type_id drop not null;

-- Add biada_pcc / sipb_list as lead and client sources. The constraint name is
-- looked up dynamically (we don't assume Postgres's auto-generated name) so we
-- find whichever check constraint on each table mentions "source" and replace it.
do $$
declare
  v_leads_source_check text;
  v_clients_source_check text;
begin
  select conname into v_leads_source_check
  from pg_constraint
  where conrelid = 'public.leads'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%source%';
  if v_leads_source_check is not null then
    execute format('alter table public.leads drop constraint %I', v_leads_source_check);
  end if;

  select conname into v_clients_source_check
  from pg_constraint
  where conrelid = 'public.clients'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%source%';
  if v_clients_source_check is not null then
    execute format('alter table public.clients drop constraint %I', v_clients_source_check);
  end if;
end $$;

alter table public.leads add constraint leads_source_check
  check (source in ('referral','repeat','walk_in','phone','website','social_media','bank','other','biada_pcc','sipb_list'));
alter table public.clients add constraint clients_source_check
  check (source in ('referral','repeat','walk_in','phone','website','social_media','bank','other','biada_pcc','sipb_list'));

-------------------------------------------------------------------------------
-- 2. Stage templates and the per-project stage track
-------------------------------------------------------------------------------
create table public.stage_templates (
  id          bigint generated always as identity primary key,
  name        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index stage_templates_active on public.stage_templates (is_active, sort_order);

create table public.project_stages (
  id                bigint generated always as identity primary key,
  project_id        bigint not null references public.projects (id) on delete restrict,
  stage_template_id bigint not null references public.stage_templates (id) on delete restrict,
  status            text not null default 'not_started' check (status in ('not_started','in_progress','done','not_needed')),
  due_on            date,
  completed_on      date,
  note              text,
  created_by        uuid references public.profiles (id),
  updated_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz,
  constraint project_stages_project_template_unique unique (project_id, stage_template_id)
);
create index project_stages_project on public.project_stages (project_id);

-------------------------------------------------------------------------------
-- 3. Document checklist per stage
-------------------------------------------------------------------------------
create table public.checklist_items (
  id                bigint generated always as identity primary key,
  stage_template_id bigint not null references public.stage_templates (id) on delete restrict,
  name              text not null,
  sort_order        int not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index checklist_items_stage on public.checklist_items (stage_template_id, sort_order);

-- No archived_at on this table (tracks "in hand or not" per project, nothing to
-- restore), so it gets touch_updated_at() only, not stamp_row(). created_by /
-- updated_by are set explicitly by app code and by ensure_project_checklist().
create table public.project_checklist (
  id                bigint generated always as identity primary key,
  project_id        bigint not null references public.projects (id) on delete restrict,
  checklist_item_id bigint not null references public.checklist_items (id) on delete restrict,
  status            text not null default 'missing' check (status in ('missing','received','not_needed')),
  note              text,
  created_by        uuid references public.profiles (id),
  updated_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint project_checklist_project_item_unique unique (project_id, checklist_item_id)
);
create index project_checklist_project on public.project_checklist (project_id);

-------------------------------------------------------------------------------
-- 4. People and company contacts
-------------------------------------------------------------------------------
create table public.people (
  id          bigint generated always as identity primary key,
  full_name   text not null,
  phone       text,
  email       text,
  note        text,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);
create index people_name on public.people (lower(full_name));
create index people_phone on public.people (phone);

create table public.company_people (
  id          bigint generated always as identity primary key,
  company_id  bigint not null references public.companies (id) on delete restrict,
  person_id   bigint not null references public.people (id) on delete restrict,
  role        text not null default 'other' check (role in ('promoter','director','partner','authorised_signatory','accountant','other')),
  is_primary  boolean not null default false,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);
-- One active link per (company, person) pair.
create unique index company_people_company_person on public.company_people (company_id, person_id) where archived_at is null;
-- At most one active primary contact per company.
create unique index company_people_one_primary on public.company_people (company_id) where is_primary and archived_at is null;
create index company_people_person on public.company_people (person_id);

-------------------------------------------------------------------------------
-- 5. "Insert missing rows" helpers + auto-seed on project creation
-------------------------------------------------------------------------------
create or replace function public.ensure_project_stages(p_project_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  insert into public.project_stages (project_id, stage_template_id)
  select p_project_id, st.id
  from public.stage_templates st
  where st.is_active
    and not exists (
      select 1 from public.project_stages ps
      where ps.project_id = p_project_id and ps.stage_template_id = st.id
    );
end $$;

create or replace function public.ensure_project_checklist(p_project_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  insert into public.project_checklist (project_id, checklist_item_id, created_by)
  select p_project_id, ci.id, auth.uid()
  from public.checklist_items ci
  where ci.is_active
    and not exists (
      select 1 from public.project_checklist pc
      where pc.project_id = p_project_id and pc.checklist_item_id = ci.id
    );
end $$;

create or replace function public.seed_project_tracks()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.ensure_project_stages(new.id);
  perform public.ensure_project_checklist(new.id);
  return new;
end $$;

create trigger seed_tracks after insert on public.projects
  for each row execute function public.seed_project_tracks();

-------------------------------------------------------------------------------
-- 5b. Set a company's primary contact atomically (the partial unique index
-- allows only one active primary per company, so clearing the old one and
-- setting the new one must happen in a single statement, not two round trips).
-------------------------------------------------------------------------------
create or replace function public.set_primary_contact(p_company_person_id bigint)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_company_id bigint;
begin
  if not public.has_perm('clients.manage') then
    raise exception 'You do not have permission to do that';
  end if;
  select company_id into v_company_id from public.company_people where id = p_company_person_id and archived_at is null;
  if v_company_id is null then
    raise exception 'Contact not found';
  end if;
  update public.company_people set is_primary = false
  where company_id = v_company_id and archived_at is null and id <> p_company_person_id and is_primary;
  update public.company_people set is_primary = true where id = p_company_person_id;
end $$;

-------------------------------------------------------------------------------
-- 6. Search clients by name/phone/city OR a project's govt reference number
-------------------------------------------------------------------------------
create or replace function public.search_client_ids(p_term text)
returns setof bigint language sql stable security invoker set search_path = '' as $$
  select c.id from public.clients c
  where c.archived_at is null
    and (c.name ilike p_term or c.phone ilike p_term or c.city ilike p_term)
  union
  select distinct c.id
  from public.clients c
  join public.companies co on co.client_id = c.id and co.archived_at is null
  join public.projects p on p.company_id = co.id and p.archived_at is null
  where c.archived_at is null and p.govt_reference_no ilike p_term;
$$;

-------------------------------------------------------------------------------
-- 7. "Projects by stage" view for the Master Admin dashboard panel
-------------------------------------------------------------------------------
create view public.project_current_stage with (security_invoker = true) as
select distinct on (ps.project_id)
  ps.project_id,
  ps.stage_template_id,
  st.name as stage_name,
  st.sort_order,
  p.assigned_to,
  p.title
from public.project_stages ps
join public.stage_templates st on st.id = ps.stage_template_id and st.is_active
join public.projects p on p.id = ps.project_id and p.archived_at is null
where ps.archived_at is null and ps.status in ('not_started', 'in_progress')
order by ps.project_id, st.sort_order;

-------------------------------------------------------------------------------
-- 8. Triggers on the new tables
-------------------------------------------------------------------------------
-- stamp_row + audit_row: tables with created_by/updated_by/archived_at
create trigger stamp before insert or update on public.project_stages for each row execute function public.stamp_row();
create trigger stamp before insert or update on public.people for each row execute function public.stamp_row();
create trigger stamp before insert or update on public.company_people for each row execute function public.stamp_row();

-- touch_updated_at only: reference tables, and project_checklist (no archived_at)
create trigger touch before update on public.stage_templates for each row execute function public.touch_updated_at();
create trigger touch before update on public.checklist_items for each row execute function public.touch_updated_at();
create trigger touch before update on public.project_checklist for each row execute function public.touch_updated_at();

-- audit_row on every new table
create trigger audit after insert or update or delete on public.stage_templates for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.checklist_items for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.project_stages for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.project_checklist for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.people for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.company_people for each row execute function public.audit_row();

-------------------------------------------------------------------------------
-- 9. Row level security — every table, policies "to authenticated", no DELETE
-------------------------------------------------------------------------------
alter table public.stage_templates enable row level security;
create policy "staff read stage templates" on public.stage_templates for select to authenticated using (public.is_staff());
create policy "admin writes stage templates" on public.stage_templates for insert to authenticated with check (public.has_perm('admin.settings'));
create policy "admin updates stage templates" on public.stage_templates for update to authenticated using (public.has_perm('admin.settings')) with check (public.has_perm('admin.settings'));

alter table public.checklist_items enable row level security;
create policy "staff read checklist items" on public.checklist_items for select to authenticated using (public.is_staff());
create policy "admin writes checklist items" on public.checklist_items for insert to authenticated with check (public.has_perm('admin.settings'));
create policy "admin updates checklist items" on public.checklist_items for update to authenticated using (public.has_perm('admin.settings')) with check (public.has_perm('admin.settings'));

alter table public.project_stages enable row level security;
create policy "read project stages" on public.project_stages for select to authenticated
  using (public.has_perm('projects.view') and (archived_at is null or public.has_perm('data.delete')));
create policy "add project stages" on public.project_stages for insert to authenticated with check (public.has_perm('projects.manage'));
create policy "edit project stages" on public.project_stages for update to authenticated
  using (public.has_perm('projects.manage')) with check (public.has_perm('projects.manage'));

alter table public.project_checklist enable row level security;
create policy "read project checklist" on public.project_checklist for select to authenticated using (public.has_perm('projects.view'));
create policy "add project checklist" on public.project_checklist for insert to authenticated with check (public.has_perm('projects.manage'));
create policy "edit project checklist" on public.project_checklist for update to authenticated
  using (public.has_perm('projects.manage')) with check (public.has_perm('projects.manage'));

alter table public.people enable row level security;
create policy "read people" on public.people for select to authenticated
  using (public.has_perm('clients.view') and (archived_at is null or public.has_perm('data.delete')));
create policy "add people" on public.people for insert to authenticated with check (public.has_perm('clients.manage'));
create policy "edit people" on public.people for update to authenticated
  using (public.has_perm('clients.manage')) with check (public.has_perm('clients.manage'));

alter table public.company_people enable row level security;
create policy "read company people" on public.company_people for select to authenticated
  using (public.has_perm('clients.view') and (archived_at is null or public.has_perm('data.delete')));
create policy "add company people" on public.company_people for insert to authenticated with check (public.has_perm('clients.manage'));
create policy "edit company people" on public.company_people for update to authenticated
  using (public.has_perm('clients.manage')) with check (public.has_perm('clients.manage'));

-------------------------------------------------------------------------------
-- 10. Starter data — safe to re-run
-------------------------------------------------------------------------------
insert into public.stage_templates (name, sort_order)
select v.name, v.sort_order
from (values
  ('Land allotment (BIADA PCC)', 1),
  ('DPR / project report', 2),
  ('SIPB Stage-1 clearance', 3),
  ('Bank finance', 4),
  ('Approvals and licences', 5),
  ('Commercial production starts', 6),
  ('SIPB financial incentive clearance', 7),
  ('Subsidy received', 8)
) as v(name, sort_order)
where not exists (select 1 from public.stage_templates st where st.name = v.name);

insert into public.checklist_items (stage_template_id, name, sort_order)
select st.id, v.name, v.sort_order
from (values
  ('DPR', 'DPR / project report', 1),
  ('Bank appraisal report', 'Bank finance', 1),
  ('Net worth certificate with UDIN', 'SIPB Stage-1 clearance', 1),
  ('Partnership deed or board resolution', 'SIPB Stage-1 clearance', 2),
  ('GST registration', 'SIPB Stage-1 clearance', 3),
  ('Udyam registration', 'SIPB Stage-1 clearance', 4),
  ('Registered lease deed', 'Land allotment (BIADA PCC)', 1),
  ('8-point affidavit', 'SIPB Stage-1 clearance', 5),
  ('Pollution NOC', 'Approvals and licences', 1),
  ('Forest/environment NOC', 'Approvals and licences', 2)
) as v(name, stage_name, sort_order)
join public.stage_templates st on st.name = v.stage_name
where not exists (
  select 1 from public.checklist_items ci where ci.stage_template_id = st.id and ci.name = v.name
);
