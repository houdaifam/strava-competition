import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

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
  await sql`
    CREATE TABLE IF NOT EXISTS strava30 (
      user_email   TEXT PRIMARY KEY,
      user_name    TEXT,
      photo_url    TEXT NOT NULL,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function getUserCompletions(email: string) {
  const rows = await sql`
    SELECT cell_id, proof_url, completed_at
    FROM completions
    WHERE user_email = ${email}
    ORDER BY completed_at DESC
  `;
  return rows as { cell_id: number; proof_url: string; completed_at: string }[];
}

export async function upsertCompletion(
  email: string,
  name: string,
  cellId: number,
  proofUrl: string
) {
  await sql`
    INSERT INTO completions (user_email, user_name, cell_id, proof_url)
    VALUES (${email}, ${name}, ${cellId}, ${proofUrl})
    ON CONFLICT (user_email, cell_id)
    DO UPDATE SET proof_url = ${proofUrl}, completed_at = NOW(), user_name = ${name}
  `;
}

export async function getLeaderboard() {
  const rows = await sql`
    SELECT
      user_email,
      user_name,
      COUNT(*)::int AS completed_count,
      MAX(completed_at) AS last_completed
    FROM completions
    GROUP BY user_email, user_name
    ORDER BY completed_count DESC, last_completed ASC
    LIMIT 50
  `;
  return rows as {
    user_email: string;
    user_name: string;
    completed_count: number;
    last_completed: string;
  }[];
}

export interface Strava30Submission {
  user_email: string;
  user_name: string | null;
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
