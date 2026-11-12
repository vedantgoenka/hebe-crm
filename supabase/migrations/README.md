# Migrations

Run these in the Supabase SQL Editor, in filename order, before deploying the matching code.
Never edit an old migration file — add a new one.

## 20261112000000_init.sql
The original schema (Build 1): permissions, staff logins, leads, clients, companies, follow-ups,
the call/meeting log, and reference tables for documents/fees/subsidies (screens for those arrive
later).

## 20261113000000_projects_contacts_checklist.sql
**Run this before deploying the "projects, stage tracking, contacts and document checklist" code.**

Adds, additively, with no drops/truncates/deletes:
- `projects.govt_reference_no` (text) and `leads.opportunity_reason` (text).
- `projects.service_type_id` becomes optional (was `not null`) — the new 8-stage track replaces
  per-service stage tracking, so a project no longer needs a service type to exist. Dropping a
  `not null` constraint loses no data.
- Two new lead/client sources, `biada_pcc` and `sipb_list` (the `leads.source` / `clients.source`
  check constraints are dropped and recreated with the two extra values — the old constraint name
  is looked up dynamically via `pg_constraint`, not hardcoded).
- `stage_templates` + `project_stages`: a single admin-editable 8-stage track used by every
  project (replacing the old per-service `stages` table for new work — that table and
  `projects.current_stage_id` are left in place, unused, per the task's rules).
- `checklist_items` + `project_checklist`: a document checklist per stage, tracked per project.
- `people` + `company_people`: contacts (promoters, directors, etc.) linked to companies, with
  at most one active "primary" contact per company (enforced by a partial unique index).
- Helper functions `ensure_project_stages()` / `ensure_project_checklist()` that idempotently
  backfill any stage/checklist rows a project is missing (called automatically when a project is
  created, and opportunistically from the project and company pages so new admin-added stages or
  documents reach existing projects without ever removing a row).
- `set_primary_contact()`: atomically swaps a company's primary contact.
- `search_client_ids()`: lets the clients list search by a related project's government
  reference number, which PostgREST's own filter syntax can't express across joined tables.
- `project_current_stage`: a view of each active project's first unfinished stage, used by the
  Master Admin "Projects by stage" dashboard panel.
- Row level security on every new table (no DELETE policy, matching the rest of the app), and
  starter data for the 8 stages and 10 checklist items.

### Known pre-existing gap (not introduced by this migration)
The Build 1 `"edit tasks"` policy on `public.tasks` only allows the assignee, or staff with
`leads.manage`/`clients.manage`, to mark a task done — it never checks `projects.manage`. A staff
member with only `projects.manage` (no lead/client permissions) who isn't the task's assignee
cannot complete a project-linked follow-up. Left unfixed here since editing an old migration is
not allowed; worth a small follow-up migration if it comes up in practice.
