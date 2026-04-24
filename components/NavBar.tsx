"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  user: { name?: string | null; email?: string | null };
}

export default function NavBar({ user }: Props) {
  const pathname = usePathname();

  return (
    <nav className="bg-keyrus-red text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-1 sm:gap-3">
        <span className="font-black italic text-lg mr-2 hidden sm:block">KEYRUS BINGO</span>
        {[
          { href: "/bingo", label: "My Card" },
          { href: "/leaderboard", label: "Leaderboard" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              pathname === href ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm hidden md:block truncate max-w-[180px]">
          {user.name || user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
