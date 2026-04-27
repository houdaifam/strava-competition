# Email Magic Link Auth — Design Spec

## Context

The app uses Strava OAuth for login. Strava caps connected athletes in sandbox mode, blocking new users with a 403 error. We're replacing Strava OAuth with email magic link authentication using NextAuth's EmailProvider and Resend.

## Goals

- Any email address can log in
- Sessions last 30 days
- Minimal changes to existing code and DB schema

## Architecture

Sessions remain JWT-based (existing behaviour). A minimal custom NextAuth adapter adds one `verification_tokens` table to Neon — the only new DB infrastructure. Resend delivers the magic link email. On click, NextAuth validates the token and creates a 30-day session.

## Components

### `lib/auth.ts`
- Replace `StravaProvider` with `EmailProvider`
- Add custom adapter implementing only two methods: `createVerificationToken` and `useVerificationToken`
- Configure `sendVerificationRequest` to send via Resend API
- JWT callbacks updated: `token.email` stores the user's actual email, `token.name` set to the email local part (e.g. `john.doe` from `john.doe@keyrus.com`)

### `lib/db.ts`
- Add `verification_tokens` table to `initDB()`:
  ```sql
  CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token      TEXT NOT NULL,
    expires    TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
  )
  ```

### `components/LoginButton.tsx`
- Replace Strava OAuth button with an email input form
- Client component: controlled input + submit handler calling `signIn("email", { email })`
- Submit button styled consistently with existing UI

### `SETUP.md`
- Remove `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`
- Add `RESEND_API_KEY` (from resend.com dashboard)
- Add `EMAIL_FROM` (sender address, e.g. `bingo@keyrus.com`)

## Data Flow

1. User enters email and submits
2. NextAuth calls `sendVerificationRequest` → Resend API sends magic link email
3. Token stored in `verification_tokens` via `createVerificationToken`
4. User clicks link → NextAuth calls `useVerificationToken` to validate and delete token
5. JWT session created with `email` and `name` from the verified address
6. `completions` table continues using `user_email` as the identity key — now stores actual email instead of Strava ID

## Environment Variables

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key from resend.com |
| `EMAIL_FROM` | Sender address for magic link emails |
| `NEXTAUTH_URL` | Unchanged |
| `NEXTAUTH_SECRET` | Unchanged |
| `DATABASE_URL` | Unchanged |
| `BLOB_READ_WRITE_TOKEN` | Unchanged |

Removed: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`

## Dependencies

- Add: `resend` npm package
- Remove: nothing (next-auth stays, StravaProvider is built-in)

## Error Handling

- Invalid email format → caught by `type="email"` HTML input before submission
- Resend API failure → NextAuth built-in error page, redirects to `/`
- Expired or already-used token → NextAuth handles automatically, redirects to `/` with error param

## Out of Scope

- Domain restriction (any email allowed)
- Migration of existing `completions` rows (Strava IDs stored as `user_email` will become stale but do not need cleanup)
