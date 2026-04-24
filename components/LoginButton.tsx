"use client";
import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("strava")}
      className="flex items-center gap-3 mx-auto bg-[#FC4C02] hover:bg-[#e04400] text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md"
    >
      <StravaIcon />
      Sign in with Strava
    </button>
  );
}

function StravaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0 4 13.828h4.172" />
    </svg>
  );
}
