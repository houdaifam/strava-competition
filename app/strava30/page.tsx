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
