# Strava OAuth Authentication — Design Spec
_Date: 2026-04-24_

## Context

The Keyrus Sports Bingo app currently uses Azure AD (Microsoft Entra ID) to restrict access to `@keyrus.com` accounts. Since the app is a Strava competition where every participant already has a Strava account, we replace Azure AD entirely with Strava OAuth.

## Goals

- Any Strava user can log in (app is shared internally, no allowlist needed)
- No Strava API calls beyond authentication (bingo completions are manual)
- Minimal code changes

## Out of Scope

- Reading Strava activities or athlete stats
- Keeping Azure AD as a fallback provider
- Email-based access restrictions

## What Changes

### `app/lib/auth.ts`
- Replace `AzureADProvider` with `StravaProvider` from `next-auth/providers/strava`
- Remove `@keyrus.com` restriction in `signIn` callback (allow all)
- Update `jwt` callback to map Strava profile fields: `firstname + lastname` → `token.name`, athlete `id` → `token.email` (used as unique identifier since Strava email is not guaranteed)

### `app/components/LoginButton.tsx`
- Replace "Sign in with Microsoft" button with "Sign in with Strava"
- Use Strava brand color (orange `#FC4C02`) and Strava logo SVG

### `app/.env.example`
- Remove `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
- Add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`

## Session Data

| Field | Value |
|---|---|
| `user.name` | `firstname lastname` (from Strava profile) |
| `user.email` | Strava athlete ID (unique identifier) |
| `user.image` | Strava profile picture URL |

## Files Unchanged

- `app/middleware.ts` — route protection stays the same
- `app/app/providers.tsx` — no changes
- `app/components/NavBar.tsx` — already uses `user.name || user.email`
- `app/app/page.tsx` — no changes

## Environment Variables

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with openssl rand -base64 32>
STRAVA_CLIENT_ID=229818
STRAVA_CLIENT_SECRET=<from strava api settings>
```

## Strava App Setup

- Authorization Callback Domain: `localhost` (dev) / production domain when deployed
- NextAuth callback URL: `[NEXTAUTH_URL]/api/auth/callback/strava`
