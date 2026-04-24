import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/bingo");

  return (
    <main className="min-h-screen bg-keyrus-blue flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm">
        {/* Header */}
        <div className="bg-keyrus-red px-8 py-10 text-center">
          <div className="flex justify-center gap-3 mb-3">
            {["B", "I", "N", "G", "O"].map((l) => (
              <span
                key={l}
                className="bg-keyrus-yellow text-black font-black text-xl w-9 h-9 rounded-full flex items-center justify-center italic"
              >
                {l}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-wide leading-none">
            KEYRUS
          </h1>
          <h2 className="text-2xl font-black text-keyrus-yellow italic tracking-widest">
            SPORTS
          </h2>
        </div>

        {/* Login */}
        <div className="px-8 py-8 text-center">
          <p className="text-gray-500 text-sm mb-6">
            Sign in with your Keyrus account to play
          </p>
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
