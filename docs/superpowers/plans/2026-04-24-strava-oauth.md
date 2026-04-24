# Strava OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Azure AD authentication with Strava OAuth so any Strava user can log in.

**Architecture:** Swap NextAuth's `AzureADProvider` for the built-in `StravaProvider`, remove the `@keyrus.com` restriction, update the login button to Strava branding, and update env vars. No new dependencies needed — `next-auth` already ships with a Strava provider.

**Tech Stack:** Next.js 14, NextAuth v4, `next-auth/providers/strava`

---

### Task 1: Update auth configuration

**Files:**
- Modify: `app/lib/auth.ts`

- [ ] **Step 1: Replace the provider and callbacks**

Replace the entire contents of `app/lib/auth.ts` with:

```typescript
import { NextAuthOptions } from "next-auth";
import StravaProvider from "next-auth/providers/strava";

export const authOptions: NextAuthOptions = {
  providers: [
    StravaProvider({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as Record<string, string>;
        token.name = `${p.firstname} ${p.lastname}`;
        token.email = String(p.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name as string;
        session.user.email = token.email as string;
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

- [ ] **Step 2: Verify TypeScript compiles**

Run from `app/`:
```bash
npx tsc --noEmit
```
Expected: no errors

---

### Task 2: Update the login button

**Files:**
- Modify: `app/components/LoginButton.tsx`

- [ ] **Step 1: Replace with Strava-branded button**

Replace the entire contents of `app/components/LoginButton.tsx` with:

```tsx
"use client";
import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("strava")}
      className="flex items-center gap-3 mx-auto bg-[#FC4C02] hover:bg-[#e04400] text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md"
    >
      <StravaIcon />
      Sign in with Strava
    </button>
  );
}

function StravaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0 4 13.828h4.172" />
    </svg>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `app/`:
```bash
npx tsc --noEmit
```
Expected: no errors

---

### Task 3: Update environment variables

**Files:**
- Modify: `app/.env.example`
- Create: `app/.env.local`

- [ ] **Step 1: Update .env.example**

Replace the entire contents of `app/.env.example` with:

```
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run-openssl-rand-base64-32-to-generate

# Strava OAuth — get from strava.com/settings/api
STRAVA_CLIENT_ID=your-client-id
STRAVA_CLIENT_SECRET=your-client-secret

# Vercel Blob — add via: vercel env pull
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Neon Postgres — get from neon.tech free tier or Vercel Storage > Neon
DATABASE_URL=postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

- [ ] **Step 2: Create .env.local with real values**

Create `app/.env.local`:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
STRAVA_CLIENT_ID=229818
STRAVA_CLIENT_SECRET=b9c17b56931a1a9dc39bf7916313fba922e06582
BLOB_READ_WRITE_TOKEN=
DATABASE_URL=
```

> Fill in `NEXTAUTH_SECRET` by running `openssl rand -base64 32` in your terminal.
> Fill in `BLOB_READ_WRITE_TOKEN` and `DATABASE_URL` from your existing setup.

- [ ] **Step 3: Verify .env.local is gitignored**

Run:
```bash
cat app/.gitignore | grep env
```
Expected: `.env*.local` or `.env.local` appears in output.

---

### Task 4: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd app && npm run dev
```

- [ ] **Step 2: Open the app**

Navigate to `http://localhost:3000`. You should see the Keyrus Sports Bingo login page with an orange "Sign in with Strava" button.

- [ ] **Step 3: Complete OAuth flow**

Click "Sign in with Strava" → authorise on Strava → you should be redirected to `/bingo`.

- [ ] **Step 4: Verify NavBar shows your Strava name**

The NavBar should show your first + last name from Strava (not an email address).

- [ ] **Step 5: Verify sign out works**

Click "Sign out" → you should be redirected back to `/`.
