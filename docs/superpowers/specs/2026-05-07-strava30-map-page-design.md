# Strava "30" Gallery Page — Design Spec

**Date:** 2026-05-07  
**Status:** Approved

## Summary

A new `/strava30` page where Keyrus employees can upload a screenshot of their Strava GPS-art route shaped like "30". Each user gets one submission (updatable at any time). The page shows the current user's submission at the top and a shared gallery of everyone else's submissions below.

## Data Model

New table `strava30` in the existing Neon PostgreSQL database:

| column | type | constraints |
|---|---|---|
| `user_email` | TEXT | PRIMARY KEY — one row per user |
| `user_name` | TEXT | display name from session |
| `photo_url` | TEXT | Vercel Blob public URL |
| `submitted_at` | TIMESTAMP | set on first insert, never updated |
| `updated_at` | TIMESTAMP | updated on every upsert |

Two new functions added to `lib/db.ts`:
- `getStrava30Submissions()` — returns all rows ordered by `submitted_at DESC`
- `upsertStrava30(email, name, photoUrl)` — INSERT … ON CONFLICT DO UPDATE

The table is created in `initDB()` alongside the existing tables.

## API Routes

### `GET /api/strava30`
- Requires authenticated session; returns 401 otherwise.
- Returns `{ submissions: Strava30Submission[] }`.

### `POST /api/strava30`
- Requires authenticated session.
- Accepts `multipart/form-data` with a single `file` field.
- Validates: file present, size ≤ 10 MB, type `image/*`.
- Uploads to Vercel Blob at path `strava30/{safeName}-{timestamp}.{ext}`.
- Upserts the row via `upsertStrava30`.
- Returns `{ photoUrl: string }`.

## Page Structure

### `app/strava30/page.tsx` (server component)
- Redirects to `/` if no session.
- Fetches all submissions via `getStrava30Submissions()`.
- Passes data to `<Strava30Gallery>`.

### `components/Strava30Gallery.tsx` (client component)
Manages upload state for the current user's submission.

**"Your 30" section (top):**
- If no submission: dashed upload area (drag-and-drop + click), same visual style as `ProofModal`'s upload zone.
- If submitted: full-width photo with a small "Edit" button overlay (top-right corner). Clicking Edit opens the file picker and immediately uploads on selection.
- Shows upload errors inline below the card.

**Gallery section (below):**
- Responsive grid: 2 columns on mobile, 3–4 columns on desktop.
- Each card: photo fills the card, user name underneath.
- Empty state: "No submissions yet — be the first!" message.
- Current user's card is excluded from the gallery grid (shown in "Your 30" instead).

## Navigation

`NavBar.tsx` gains a third link: **"The 30"** → `/strava30`, using the same active-highlight logic as the existing links.

## Styling

Matches the existing design system:
- Page background: `bg-keyrus-blue`
- Section header card: `bg-keyrus-red` with white text
- Content panels: white `rounded-2xl` with `shadow-2xl`
- Upload area: dashed border, hover turns `keyrus-blue`
- Buttons: `bg-keyrus-red` primary, `border-gray-200` secondary

## Files Changed / Created

| file | action |
|---|---|
| `lib/db.ts` | add `getStrava30Submissions`, `upsertStrava30`, extend `initDB` |
| `app/api/strava30/route.ts` | create (GET + POST handlers) |
| `app/strava30/page.tsx` | create (server component) |
| `components/Strava30Gallery.tsx` | create (client component) |
| `components/NavBar.tsx` | add "The 30" nav link |

## Out of Scope

- Likes / reactions on submissions
- Moderation / admin controls
- Multiple photos per user
- Comments
