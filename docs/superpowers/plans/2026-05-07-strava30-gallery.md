# Strava 30 Gallery Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/strava30` page where each Keyrus employee can upload one screenshot of their Strava GPS-art "30" route and browse everyone else's in a shared gallery.

**Architecture:** Server component page fetches all submissions from Neon Postgres and passes them to a client component that manages upload state. A dedicated API route at `/api/strava30` handles file upload to Vercel Blob and DB upsert. One row per user, updatable at any time.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Neon Postgres (`@neondatabase/serverless`), Vercel Blob (`@vercel/blob`), NextAuth sessions.

> **No git commits** — the user manages git. Skip all `git add` / `git commit` steps.

---

## File Map

| file | action | responsibility |
|---|---|---|
| `lib/db.ts` | modify | add `Strava30Submission` type + `getStrava30Submissions` + `upsertStrava30` |
| `app/api/strava30/route.ts` | create | GET all submissions, POST upload + upsert |
| `components/Strava30Gallery.tsx` | create | client component: "Your 30" upload card + gallery grid |
| `app/strava30/page.tsx` | create | server component: auth guard + data fetch |
| `components/NavBar.tsx` | modify | add "The 30" nav link |

---

## Task 1: Add DB type and functions

**Files:**
- Modify: `lib/db.ts`

The existing `initDB()` function is never called in this app — tables were created directly in Neon. Add the new table the same way: run the SQL manually against the Neon console (or via `psql`), then add the TypeScript helpers to `lib/db.ts`.

- [ ] **Step 1: Create the `strava30` table in Neon**

Run this SQL in the Neon console (Dashboard → SQL Editor) or via `psql $DATABASE_URL`:

```sql
CREATE TABLE IF NOT EXISTS strava30 (
  user_email   TEXT PRIMARY KEY,
  user_name    TEXT,
  photo_url    TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 2: Add the `Strava30Submission` type and DB functions to `lib/db.ts`**

Append to the bottom of `lib/db.ts`:

```typescript
export interface Strava30Submission {
  user_email: string;
  user_name: string;
  photo_url: string;
  submitted_at: string;
  updated_at: string;
}

export async function getStrava30Submissions(): Promise<Strava30Submission[]> {
  const rows = await sql`
    SELECT user_email, user_name, photo_url, submitted_at, updated_at
    FROM strava30
    ORDER BY submitted_at DESC
  `;
  return rows as Strava30Submission[];
}

export async function upsertStrava30(
  email: string,
  name: string,
  photoUrl: string
): Promise<void> {
  await sql`
    INSERT INTO strava30 (user_email, user_name, photo_url)
    VALUES (${email}, ${name}, ${photoUrl})
    ON CONFLICT (user_email)
    DO UPDATE SET
      user_name  = ${name},
      photo_url  = ${photoUrl},
      updated_at = NOW()
  `;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/houdaifam/Keyrus/Strava/app && npx tsc --noEmit
```

Expected: no errors related to `lib/db.ts`.

---

## Task 2: Create the API route

**Files:**
- Create: `app/api/strava30/route.ts`

Mirrors the existing `/api/upload` pattern exactly, but scoped to a single file and the `strava30` table.

- [ ] **Step 1: Create `app/api/strava30/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getStrava30Submissions, upsertStrava30 } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const submissions = await getStrava30Submissions();
  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const safeName = session.user.email.replace(/[@.]/g, "_");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `strava30/${safeName}-${Date.now()}.${ext}`;
  const blob = await put(path, file, { access: "public" });

  await upsertStrava30(
    session.user.email,
    session.user.name || session.user.email,
    blob.url
  );

  return NextResponse.json({ photoUrl: blob.url });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/houdaifam/Keyrus/Strava/app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test — GET route**

With the dev server running (`npm run dev`), open a browser tab and navigate to `http://localhost:3000/api/strava30`. Expected: `{"submissions":[]}` (empty array, no 401, assuming you're logged in).

---

## Task 3: Create the Strava30Gallery client component

**Files:**
- Create: `components/Strava30Gallery.tsx`

This component receives the server-fetched submissions as props and owns all upload state locally. On successful upload the submission list updates optimistically without a page reload.

- [ ] **Step 1: Create `components/Strava30Gallery.tsx`**

```typescript
"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { Strava30Submission } from "@/lib/db";

interface Props {
  initialSubmissions: Strava30Submission[];
  currentUserEmail: string;
  currentUserName: string;
}

export default function Strava30Gallery({
  initialSubmissions,
  currentUserEmail,
  currentUserName,
}: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mySubmission = submissions.find((s) => s.user_email === currentUserEmail);
  const others = submissions.filter((s) => s.user_email !== currentUserEmail);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/strava30", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const updated: Strava30Submission = {
        user_email: currentUserEmail,
        user_name: currentUserName,
        photo_url: data.photoUrl,
        submitted_at: mySubmission?.submitted_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSubmissions((prev) => [
        updated,
        ...prev.filter((s) => s.user_email !== currentUserEmail),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Your 30 */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-keyrus-red p-4">
          <h2 className="text-white font-black text-xl italic tracking-wide">YOUR 30</h2>
        </div>
        <div className="p-5">
          {mySubmission ? (
            <div className="relative">
              <div className="relative w-full h-72 rounded-xl overflow-hidden">
                <Image
                  src={mySubmission.photo_url}
                  alt="Your Strava 30"
                  fill
                  className="object-cover"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute top-3 right-3 bg-black/60 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors disabled:opacity-40"
              >
                {uploading ? "Uploading…" : "Edit"}
              </button>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-keyrus-blue transition-colors"
            >
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-gray-500 font-medium">
                {uploading ? "Uploading…" : "Upload your Strava 30 screenshot"}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Click or drag & drop · JPG, PNG · max 10 MB
              </p>
            </div>
          )}
          {error && (
            <p className="mt-3 text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Gallery */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-keyrus-red p-4">
          <h2 className="text-white font-black text-xl italic tracking-wide">
            THE WALL OF 30s
          </h2>
        </div>
        <div className="p-5">
          {others.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              No submissions yet — be the first! 🏃
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {others.map((s) => (
                <div key={s.user_email} className="space-y-1">
                  <div className="relative w-full h-40 rounded-xl overflow-hidden">
                    <Image
                      src={s.photo_url}
                      alt={`${s.user_name}'s 30`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-xs font-semibold text-gray-600 truncate px-1">
                    {s.user_name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/houdaifam/Keyrus/Strava/app && npx tsc --noEmit
```

Expected: no errors.

---

## Task 4: Create the server page

**Files:**
- Create: `app/strava30/page.tsx`

Follows the same pattern as `app/bingo/page.tsx` and `app/leaderboard/page.tsx`: auth guard → fetch data → render layout.

- [ ] **Step 1: Create `app/strava30/page.tsx`**

```typescript
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getStrava30Submissions } from "@/lib/db";
import NavBar from "@/components/NavBar";
import Strava30Gallery from "@/components/Strava30Gallery";

export default async function Strava30Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const submissions = await getStrava30Submissions();

  return (
    <main className="min-h-screen bg-keyrus-blue">
      <NavBar user={session.user} />
      <Strava30Gallery
        initialSubmissions={submissions}
        currentUserEmail={session.user.email}
        currentUserName={session.user.name || session.user.email}
      />
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/houdaifam/Keyrus/Strava/app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Navigate to `http://localhost:3000/strava30`. Expected:
- NavBar visible
- "YOUR 30" card with upload area (dashed border, map emoji)
- "THE WALL OF 30s" card with empty state message

---

## Task 5: Add nav link

**Files:**
- Modify: `components/NavBar.tsx`

- [ ] **Step 1: Add "The 30" to the nav links array in `components/NavBar.tsx`**

Find this block (lines 17–25):

```typescript
        {[
          { href: "/bingo", label: "My Card" },
          { href: "/leaderboard", label: "Leaderboard" },
        ].map(({ href, label }) => (
```

Replace with:

```typescript
        {[
          { href: "/bingo", label: "My Card" },
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/strava30", label: "The 30" },
        ].map(({ href, label }) => (
```

- [ ] **Step 2: Manual smoke test**

Reload any page. Expected: three nav links — "My Card", "Leaderboard", "The 30". Clicking "The 30" navigates to `/strava30` with the active highlight applied.

---

## Task 6: End-to-end verification

- [ ] **Step 1: Upload a test image**

On `http://localhost:3000/strava30`, click the upload area, select any image. Expected:
- Upload completes without error
- "YOUR 30" card switches from the dashed upload area to showing the photo with an "Edit" button overlay

- [ ] **Step 2: Verify the DB row**

In the Neon SQL Editor:

```sql
SELECT * FROM strava30;
```

Expected: one row for your email with a non-null `photo_url` pointing to Vercel Blob.

- [ ] **Step 3: Edit the submission**

Click "Edit" on the "YOUR 30" card, pick a different image. Expected:
- Photo updates in place
- DB row's `updated_at` is newer than `submitted_at`

- [ ] **Step 4: Verify unauthenticated redirect**

Sign out, navigate to `http://localhost:3000/strava30`. Expected: redirect to `/` (login page).
