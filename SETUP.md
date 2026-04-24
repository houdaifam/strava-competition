# Keyrus Sports Bingo — Deployment Guide

## Step 1 — Push to GitHub

Create a new repo on github.com, then in this folder:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/keyrus-sports-bingo.git
git push -u origin main
```

---

## Step 2 — Connect to Vercel

1. Go to **vercel.com** → **Add New Project** → import your GitHub repo
2. Framework is auto-detected as **Next.js** — leave all build settings as-is
3. Don't deploy yet — add env vars first (Step 4)

---

## Step 3 — Add storage (both free)

### Neon Postgres (database)
1. Go to **neon.tech** → sign up free → create a project
2. Copy the **Connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
3. Save it — you'll need it as `DATABASE_URL`

### Vercel Blob (proof photo storage)
1. In Vercel dashboard → your project → **Storage** tab → **Create** → **Blob**
2. After creation, go to **Settings** → copy the `BLOB_READ_WRITE_TOKEN` value

---

## Step 4 — Update Strava app callback domain

1. Go to **strava.com/settings/api**
2. Set **Authorization Callback Domain** to your Vercel domain (e.g. `keyrus-sports-bingo.vercel.app`)

---

## Step 5 — Add env vars in Vercel

In your Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `NEXTAUTH_URL` | `https://YOUR-APP.vercel.app` |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate |
| `STRAVA_CLIENT_ID` | From strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | From strava.com/settings/api |
| `DATABASE_URL` | From Step 3 (Neon) |
| `BLOB_READ_WRITE_TOKEN` | From Step 3 (Vercel Blob) |

---

## Step 6 — Deploy

Click **Deploy** in Vercel. The database table is created automatically on first login.

Every future `git push` to `main` triggers a new deploy automatically.
