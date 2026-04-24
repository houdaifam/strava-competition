import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "keyrus-red": "#BE1E2D",
        "keyrus-blue": "#5BB8D4",
        "keyrus-yellow": "#F4A31B",
        "keyrus-cream": "#EDE8D8",
      },
    },
  },
  plugins: [],
};

export default config;
