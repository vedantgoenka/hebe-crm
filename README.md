# HEBE CRM

Next.js 16 + Supabase + Vercel. Build 1: logins and permissions, leads, clients and companies,
call/meeting log, follow-ups, My Work dashboard, and the admin panel.

## How it is put together

- **Next.js (TypeScript, Tailwind):** every screen and all server logic, in `src/`.
- **Supabase:** Postgres database, staff logins. Region: **Mumbai (ap-south-1)**.
- **Vercel:** hosting, deploys automatically from GitHub.

Data safety is built into the database, not just the screens:
- Permissions are enforced by row level security, so a missing check in the UI can't leak data.
- No table allows deletes from the app. "Archive" hides a record; only the Master Admin can archive.
- Every insert, change and archive is recorded in `audit_log` with who did it.
- Database changes live in `supabase/migrations/` as versioned files. Never edit an old migration;
  add a new one.

## One-time setup

### 1. Supabase
1. Create a project at supabase.com. Region: **South Asia (Mumbai)**. Save the database password somewhere safe.
2. **SQL Editor → New query**: paste all of `supabase/migrations/20261112000000_init.sql` and run it.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
   Staff accounts are created only from the admin panel.
4. **Project Settings → API Keys**: copy the project URL, the publishable key and a secret key.

### 2. Master Admin (run once, on your own computer)
```bash
cp .env.example .env.local   # then paste the three Supabase values
npm install
node --env-file=.env.local scripts/create-master-admin.mjs "Owner Full Name" ownerusername
```
It asks for the password in the terminal. It refuses to run if a Master Admin already exists.

### 3. GitHub and Vercel
1. Push this folder to a **private** GitHub repo. (`.env.local` is ignored and never uploaded.)
2. On vercel.com: **Add New → Project →** import the repo. Framework: Next.js (detected).
3. **Settings → Environment Variables**: add `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `STAFF_LOGIN_DOMAIN=users.hebe.in`.
4. **Settings → Functions**: set the region to **Mumbai (bom1)** so pages stay fast next to the database.
5. Deploy. Vercel gives a `*.vercel.app` link to test with.

### 4. Domain
Vercel → **Settings → Domains** → add `crm.hebe.in`. Vercel shows one DNS record (a CNAME);
add it wherever hebe.in's DNS is managed (Hostinger hPanel → DNS). SSL is automatic.

## Everyday workflow

- Push to any branch → Vercel builds a private preview link to try changes.
- Merge to `main` → it goes live at crm.hebe.in.
- New database change → add a new file in `supabase/migrations/` and run it in the SQL Editor
  before merging the code that needs it.

## Local development
```bash
npm install
npm run dev   # http://localhost:3000, uses .env.local
```

## Not in Build 1 yet
Backups to GitHub and the keep-awake ping (step 5 of the plan), projects and stages, documents,
fees, subsidies, archive restore screen, WhatsApp reminders.
