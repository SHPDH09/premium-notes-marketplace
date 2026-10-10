import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "brand-tilt": {
          "0%, 100%": { transform: "rotateY(-14deg) rotateX(6deg) translateY(0)" },
          "50%": { transform: "rotateY(14deg) rotateX(-4deg) translateY(-6px)" },
        },
        "brand-shine": {
          "0%": { transform: "translateX(-130%) skewX(-16deg)", opacity: "0" },
          "15%": { opacity: "0.85" },
          "100%": { transform: "translateX(230%) skewX(-16deg)", opacity: "0" },
        },
      },
      animation: {
        marquee: "marquee linear infinite",
        "brand-tilt": "brand-tilt 3.2s ease-in-out infinite",
        "brand-shine": "brand-shine 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
