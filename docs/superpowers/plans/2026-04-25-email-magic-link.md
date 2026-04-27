# Email Magic Link Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Strava OAuth with email magic link authentication using NextAuth EmailProvider and Resend.

**Architecture:** Keep JWT sessions (30 days). Add a minimal custom NextAuth adapter backed by two new Neon tables (`users`, `verification_tokens`). Resend delivers the magic link. LoginButton becomes an email input form.

**Tech Stack:** Next.js 16, NextAuth v4, Neon Postgres (`@neondatabase/serverless`), Resend SDK

---

## File Map

| File | Action | What changes |
|---|---|---|
| `package.json` | Modify | Add `resend` dependency |
| `lib/db.ts` | Modify | Add `users` + `verification_tokens` table creation to `initDB()` |
| `lib/auth.ts` | Replace | Swap `StravaProvider` for `EmailProvider` + custom adapter + Resend |
| `components/LoginButton.tsx` | Replace | Email input form instead of Strava OAuth button |
| `.env.local` | Modify | Swap `STRAVA_*` for `RESEND_API_KEY` + `EMAIL_FROM` |
| `.env.example` | Modify | Same swap for documentation |
| `SETUP.md` | Modify | Update env var table |

---

## Task 1: Install Resend

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd /Users/houdaifam/keyrus/strava/app && npm install resend
```

Expected output: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Verify package.json**

Open `package.json` and confirm `"resend"` appears in `dependencies`.

- [ ] **Step 3: Commit**

```bash
cd /Users/houdaifam/keyrus/strava/app && git add package.json package-lock.json && git commit -m "feat: add resend dependency"
```

---

## Task 2: Add DB tables for auth

**Files:**
- Modify: `lib/db.ts`

NextAuth EmailProvider needs two tables:
- `users` — stores each user who has ever signed in
- `verification_tokens` — stores one-time magic link tokens

- [ ] **Step 1: Update `lib/db.ts`**

Replace the entire `initDB` function with this:

```typescript
export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name           TEXT,
      email          TEXT UNIQUE,
      email_verified TIMESTAMPTZ,
      image          TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token      TEXT NOT NULL,
      expires    TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS completions (
      id            SERIAL PRIMARY KEY,
      user_email    VARCHAR(255) NOT NULL,
      user_name     VARCHAR(255),
      cell_id       INTEGER NOT NULL,
      proof_url     TEXT NOT NULL,
      completed_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_email, cell_id)
    )
  `;
}
```

All three `CREATE TABLE IF NOT EXISTS` statements are idempotent — safe to run on an existing DB.

- [ ] **Step 2: Commit**

```bash
cd /Users/houdaifam/keyrus/strava/app && git add lib/db.ts && git commit -m "feat: add users and verification_tokens tables"
```

---

## Task 3: Replace auth.ts

**Files:**
- Replace: `lib/auth.ts`

This is the core change. The custom adapter implements the 4 methods NextAuth calls during the email sign-in flow:
1. `createVerificationToken` — store token when user submits email
2. `useVerificationToken` — validate + delete token when user clicks link
3. `getUserByEmail` — check if user already exists
4. `createUser` — create user on first sign-in
5. `updateUser` — mark email as verified after successful link click

- [ ] **Step 1: Replace `lib/auth.ts` entirely**

```typescript
import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

const sql = neon(process.env.DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY!);

type DBUser = { id: string; name: string | null; email: string; emailVerified: Date | null; image: string | null };
type VerificationToken = { identifier: string; token: string; expires: Date };

const adapter = {
  async createVerificationToken(token: VerificationToken): Promise<VerificationToken> {
    await sql`
      INSERT INTO verification_tokens (identifier, token, expires)
      VALUES (${token.identifier}, ${token.token}, ${token.expires})
      ON CONFLICT (identifier, token) DO UPDATE SET expires = ${token.expires}
    `;
    return token;
  },
  async useVerificationToken({ identifier, token }: { identifier: string; token: string }): Promise<VerificationToken | null> {
    const rows = await sql`
      DELETE FROM verification_tokens
      WHERE identifier = ${identifier} AND token = ${token}
      RETURNING identifier, token, expires
    `;
    if (rows.length === 0) return null;
    return rows[0] as VerificationToken;
  },
  async getUserByEmail(email: string): Promise<DBUser | null> {
    const rows = await sql`
      SELECT id, name, email, email_verified AS "emailVerified", image
      FROM users WHERE email = ${email}
    `;
    return (rows[0] as DBUser) ?? null;
  },
  async createUser(user: Omit<DBUser, "id">): Promise<DBUser> {
    const name = user.email.split("@")[0].replace(/[._]/g, " ");
    const rows = await sql`
      INSERT INTO users (email, name, email_verified, image)
      VALUES (${user.email}, ${name}, ${user.emailVerified}, ${user.image ?? null})
      RETURNING id, name, email, email_verified AS "emailVerified", image
    `;
    return rows[0] as DBUser;
  },
  async updateUser(user: Partial<DBUser> & { id: string }): Promise<DBUser> {
    const rows = await sql`
      UPDATE users SET email_verified = ${user.emailVerified ?? null}
      WHERE id = ${user.id}
      RETURNING id, name, email, email_verified AS "emailVerified", image
    `;
    return rows[0] as DBUser;
  },
};

export const authOptions: NextAuthOptions = {
  adapter: adapter as any,
  providers: [
    EmailProvider({
      sendVerificationRequest: async ({ identifier, url }) => {
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: identifier,
          subject: "Your Keyrus Sports Bingo sign-in link",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#1a1a2e">Sign in to Keyrus Sports Bingo</h2>
              <p>Click the button below to sign in. This link expires in 24 hours.</p>
              <a href="${url}" style="display:inline-block;background:#c8102e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                Sign in
              </a>
              <p style="color:#666;font-size:12px;margin-top:24px">
                If you did not request this email, you can safely ignore it.
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        token.name = (user as DBUser).name ?? user.email.split("@")[0].replace(/[._]/g, " ");
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/houdaifam/keyrus/strava/app && git add lib/auth.ts && git commit -m "feat: replace Strava OAuth with email magic link"
```

---

## Task 4: Update LoginButton

**Files:**
- Replace: `components/LoginButton.tsx`

Replace the Strava OAuth button with an email input form. On submit, call `signIn("email", { email })` which triggers the NextAuth email flow.

- [ ] **Step 1: Replace `components/LoginButton.tsx` entirely**

```typescript
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginButton() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, redirect: false });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-gray-700 font-semibold mb-1">Check your inbox</p>
        <p className="text-gray-500 text-sm">
          We sent a sign-in link to <span className="font-medium">{email}</span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-keyrus-red"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-keyrus-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md"
      >
        {loading ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/houdaifam/keyrus/strava/app && git add components/LoginButton.tsx && git commit -m "feat: replace Strava button with email magic link form"
```

---

## Task 5: Update env files and docs

**Files:**
- Modify: `.env.local`
- Modify: `.env.example`
- Modify: `SETUP.md`

- [ ] **Step 1: Update `.env.local`**

Remove `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`. Add:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=bingo@yourdomain.com
```

Replace the values with your actual Resend API key (from resend.com → API Keys) and a verified sender address.

- [ ] **Step 2: Update `.env.example`**

Replace:
```
# Strava OAuth — get from strava.com/settings/api
STRAVA_CLIENT_ID=your-client-id
STRAVA_CLIENT_SECRET=your-client-secret
```

With:
```
# Resend — get from resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=bingo@yourdomain.com
```

- [ ] **Step 3: Update `SETUP.md` env var table**

Replace the `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` rows:

```markdown
| `RESEND_API_KEY` | From resend.com → API Keys |
| `EMAIL_FROM`     | Sender address (must be verified in Resend) |
```

- [ ] **Step 4: Commit**

```bash
cd /Users/houdaifam/keyrus/strava/app && git add .env.example SETUP.md && git commit -m "docs: update env vars for email magic link auth"
```

Note: do NOT commit `.env.local` — it contains real secrets and should be in `.gitignore`.

---

## Task 6: Verify locally

- [ ] **Step 1: Confirm `.env.local` has real values**

Check that `RESEND_API_KEY` is set to a real key from resend.com and `EMAIL_FROM` is a sender address verified in your Resend account.

- [ ] **Step 2: Start the dev server**

```bash
cd /Users/houdaifam/keyrus/strava/app && npm run dev
```

- [ ] **Step 3: Test the sign-in flow**

1. Open `http://localhost:3000`
2. Confirm the Strava button is gone, replaced with an email input
3. Enter a real email address and submit
4. Confirm "Check your inbox" message appears
5. Open the email — confirm the magic link arrived
6. Click the link — confirm you are redirected to `/bingo`
7. Confirm your name appears in the NavBar (derived from email local part)
8. Refresh the page — confirm you stay logged in (session persisted)

- [ ] **Step 4: Test session persistence**

Close the browser tab, reopen `http://localhost:3000` — confirm it redirects straight to `/bingo` without asking to sign in again (JWT session valid for 30 days).
