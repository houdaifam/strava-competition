import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getLeaderboard, initDB } from "@/lib/db";
import { TOTAL_CELLS } from "@/lib/bingo-cells";
import NavBar from "@/components/NavBar";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  await initDB();
  const leaderboard = await getLeaderboard();

  return (
    <main className="min-h-screen bg-keyrus-blue">
      <NavBar user={session.user} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-keyrus-red p-5 text-center">
            <h1 className="text-3xl font-black text-white italic tracking-wide">
              LEADERBOARD
            </h1>
          </div>

          <div className="p-6">
            {leaderboard.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No completions yet — be the first! 🏃
              </p>
            ) : (
              <ol className="space-y-3">
                {leaderboard.map((entry, i) => (
                  <li
                    key={entry.user_email}
                    className={`flex items-center gap-4 p-4 rounded-xl ${
                      entry.user_email === session.user?.email
                        ? "bg-keyrus-blue/20 border-2 border-keyrus-blue"
                        : "bg-gray-50"
                    }`}
                  >
                    <span className="text-2xl w-8 text-center">
                      {MEDALS[i] ?? (
                        <span className="text-gray-400 font-bold text-base">
                          {i + 1}
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">
                        {entry.user_name || entry.user_email}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {entry.user_email}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-keyrus-red">
                        {entry.completed_count}
                      </p>
                      <p className="text-xs text-gray-400">/{TOTAL_CELLS}</p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-20 hidden sm:block">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-keyrus-red rounded-full"
                          style={{
                            width: `${(entry.completed_count / TOTAL_CELLS) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
