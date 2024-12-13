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
        "lm-black": "#111111", // Dark background color
        "lm-dark-gray": "#1c1c1c", // Dark background color
        "lm-orange": "#CFFF04", // Orange color for highlights
        "lm-yellow": "#ffff00", // Yellow color for emphasis
        "lm-green": "#00ff00", // Bright green text color
        "lm-gray": "#a6a6a6", // Gray for secondary text
        "lm-red": "#ff3333", // Bright red for errors or warnings,
        "lm-terminal-lightgray": "#9e9e9e",
        "lm-terminal-gray": "#474546",
        "lm-terminal-darkgray": "#232323",
      },
      fontFamily: {
        pixer: ["FontName", "Helvetica", "Arial", "sans-serif"], // Monospace font
        // mono: ["Menlo", "Monaco", "Consolas", "Courier New", "monospace"], // Monospace font
        // sans: ["Inter", "Roboto", "Arial", "Helvetica", "sans-serif"], // Sans-serif font
      },
      fontSize: {
        xxs: "4px",
        xs: "8px",
        sm: "16px",
        md: "18px",
        base: "24px",
        xl: "32px",
        "2xl": "64px",
        "3xl": "1.953rem",
        "4xl": "2.441rem",
        "5xl": "3.052rem",
      },
      screens: {
        xs: "0px",
        sm: "640px",
        md: "840px",
        lg: "1024px",
        xl: "1280px",
      },
      scale: {
        "25": "0.25",
      },
    },
  },
  plugins: [],
};
export default config;
