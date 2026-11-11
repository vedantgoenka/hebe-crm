// One-time setup: creates the single Master Admin login.
// Usage (from the project folder, with .env.local filled in):
//   node --env-file=.env.local scripts/create-master-admin.mjs "Full Name" username
// You'll be asked for the password; it is never stored in a file.
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

const [fullName, username] = process.argv.slice(2);
if (!fullName || !username || !/^[a-z0-9._-]{3,40}$/.test(username)) {
  console.error('Usage: node --env-file=.env.local scripts/create-master-admin.mjs "Full Name" username');
  console.error("Username: 3-40 lowercase letters, numbers, dots, dashes or underscores.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const domain = process.env.STAFF_LOGIN_DOMAIN || "users.hebe.in";
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existing } = await admin.from("profiles").select("username").eq("is_master_admin", true).maybeSingle();
if (existing) {
  console.error(`A Master Admin already exists (${existing.username}). Nothing changed.`);
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("Password for the Master Admin (10+ characters): ");
rl.close();
if (password.length < 10) {
  console.error("Password too short. Nothing changed.");
  process.exit(1);
}

const { data, error } = await admin.auth.admin.createUser({
  email: `${username}@${domain}`,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (error) {
  console.error("Could not create the login:", error.message);
  process.exit(1);
}

const { error: profileError } = await admin
  .from("profiles")
  .insert({ id: data.user.id, full_name: fullName, username, is_master_admin: true, is_active: true });
if (profileError) {
  await admin.auth.admin.deleteUser(data.user.id);
  console.error("Could not create the profile:", profileError.message);
  process.exit(1);
}

console.log(`Master Admin created. Log in with username "${username}".`);
