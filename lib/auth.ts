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
