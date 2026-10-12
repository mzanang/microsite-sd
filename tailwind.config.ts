import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#19342B",
        moss: "#2F6B55",
        clay: "#D7864A",
        paper: "#F6F3EC",
        sand: "#E9E3D5",
        mist: "#EEF3ED",
      },
      fontFamily: { sans: ["var(--font-poppins)", "Arial", "sans-serif"], display: ["var(--font-poppins)", "Arial", "sans-serif"] },
      boxShadow: { soft: "0 18px 60px rgba(25, 52, 43, .13)" },
    },
  },
  plugins: [],
};

export default config;
