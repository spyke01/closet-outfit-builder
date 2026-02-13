import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: {
            DEFAULT: "#194957",
            dark: "#0F2E38",
            light: "#5A97AC",
          },
          terracotta: {
            DEFAULT: "#D49E7C",
            light: "#E5BFA3",
            dark: "#C07D4F",
          },
          cream: "#F1E2C4",
          black: "#231F20",
        },
        success: {
          DEFAULT: "#10B981",
          light: "#D1FAE5",
          dark: "#065F46",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
          dark: "#92400E",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
          dark: "#991B1B",
        },
        info: {
          DEFAULT: "#3B82F6",
          light: "#DBEAFE",
          dark: "#1E40AF",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        cream: {
          50: "#FFF8EE",
          100: "#F7E9CF",
          200: "#F1E2C4",
        },
        navy: {
          50: "#E7EFF2",
          100: "#CEDFE5",
          200: "#A7C1CC",
          600: "#194957",
        },
        slate: {
          25: "#F4F8F9",
          50: "#E8F0F2",
          100: "#D7E4E8",
          200: "#BFD2D9",
          300: "#9EBAC4",
          400: "#7CA3B1",
          500: "#5A97AC",
          600: "#3F7588",
          700: "#2D4A58",
          800: "#233A45",
          850: "#1E313A",
          900: "#1A2830",
        },
        gray: {
          50: "#F4F8F9",
          100: "#E8F0F2",
          200: "#D7E4E8",
          300: "#BFD2D9",
          400: "#9EBAC4",
          500: "#7CA3B1",
          600: "#5A97AC",
          700: "#2D4A58",
          800: "#233A45",
          900: "#1A2830",
        },
      },
      fontFamily: {
        'sans': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'serif': ['var(--font-playfair-display)', 'serif'],
        'display': ['var(--font-playfair-display)', 'serif'],
      },
    },
  },
  plugins: [],
}
