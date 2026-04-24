import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function initDB() {
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
