#!/usr/bin/env node
/**
 * Usage: node scripts/make-admin.mjs <email>
 * Sets publicMetadata.role = "admin" for a user by email address.
 * Requires CLERK_SECRET_KEY in the environment.
 */

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/make-admin.mjs <email>");
  process.exit(1);
}

const key = process.env.CLERK_SECRET_KEY;
if (!key) {
  console.error("CLERK_SECRET_KEY is not set");
  process.exit(1);
}

const base = "https://api.clerk.com/v1";
const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

// Find user by email
const usersRes = await fetch(
  `${base}/users?email_address=${encodeURIComponent(email)}&limit=5`,
  { headers }
);
if (!usersRes.ok) {
  const text = await usersRes.text();
  console.error("Failed to list users:", usersRes.status, text);
  process.exit(1);
}

const users = await usersRes.json();
if (!users.length) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

const user = users[0];
console.log(`Found user: ${user.id} (${user.email_addresses?.[0]?.email_address})`);
console.log(`Current publicMetadata:`, JSON.stringify(user.public_metadata));

// Set admin role
const patchRes = await fetch(`${base}/users/${user.id}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ public_metadata: { ...user.public_metadata, role: "admin" } }),
});

if (!patchRes.ok) {
  const text = await patchRes.text();
  console.error("Failed to update user:", patchRes.status, text);
  process.exit(1);
}

const updated = await patchRes.json();
console.log(`Done! publicMetadata is now:`, JSON.stringify(updated.public_metadata));
