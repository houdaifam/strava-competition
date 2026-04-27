import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserCompletions } from "@/lib/db";
import { TOTAL_CELLS } from "@/lib/bingo-cells";
import BingoCard from "@/components/BingoCard";
import NavBar from "@/components/NavBar";

export default async function BingoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const completions = await getUserCompletions(session.user.email);
  const completionMap: Record<number, string> = {};
  completions.forEach((c) => {
    completionMap[c.cell_id] = c.proof_url;
  });

  return (
    <main className="min-h-screen bg-keyrus-blue">
      <NavBar user={session.user} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BingoCard
          initialCompletionMap={completionMap}
          userEmail={session.user.email}
        />
        <p className="text-center text-white/80 mt-4 font-semibold text-sm">
          {completions.length} / {TOTAL_CELLS} completed
        </p>
      </div>
    </main>
  );
}
