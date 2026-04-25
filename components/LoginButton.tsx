"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginButton() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, redirect: false });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-gray-700 font-semibold mb-1">Check your inbox</p>
        <p className="text-gray-500 text-sm">
          We sent a sign-in link to <span className="font-medium">{email}</span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-keyrus-red"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-keyrus-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md"
      >
        {loading ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
