import type { Config } from "tailwindcss"

const config = {
  // Removed: darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "logo-amber": {
          50: "hsl(35 90% 95%)",
          100: "hsl(35 90% 90%)",
          200: "hsl(35 90% 80%)",
          300: "hsl(35 90% 70%)",
          400: "hsl(35 90% 60%)",
          DEFAULT: "hsl(35 90% 55%)", // A warm amber
          500: "hsl(35 90% 55%)",
          600: "hsl(35 90% 45%)",
          700: "hsl(35 90% 35%)",
          800: "hsl(35 90% 25%)",
          900: "hsl(35 90% 15%)",
          950: "hsl(35 90% 10%)",
          foreground: "hsl(0 0% 100%)",
        },
        "logo-rose": {
          50: "hsl(340 80% 95%)",
          100: "hsl(340 80% 90%)",
          200: "hsl(340 80% 80%)",
          300: "hsl(340 80% 70%)",
          400: "hsl(340 80% 60%)",
          DEFAULT: "hsl(340 80% 65%)", // A soft rose
          500: "hsl(340 80% 65%)",
          600: "hsl(340 80% 55%)",
          700: "hsl(340 80% 45%)",
          800: "hsl(340 80% 35%)",
          900: "hsl(340 80% 25%)",
          950: "hsl(340 80% 15%)",
          foreground: "hsl(0 0% 100%)",
        },
        "logo-purple": {
          50: "hsl(270 70% 95%)",
          100: "hsl(270 70% 90%)",
          200: "hsl(270 70% 80%)",
          300: "hsl(270 70% 70%)",
          400: "hsl(270 70% 60%)",
          DEFAULT: "hsl(270 70% 60%)", // A vibrant purple
          500: "hsl(270 70% 60%)",
          600: "hsl(270 70% 50%)",
          700: "hsl(270 70% 40%)",
          800: "hsl(270 70% 30%)",
          900: "hsl(270 70% 20%)",
          950: "hsl(270 70% 10%)",
          foreground: "hsl(0 0% 100%)",
        },
        "logo-teal": {
          50: "hsl(173 80% 95%)",
          100: "hsl(173 80% 90%)",
          200: "hsl(173 80% 80%)",
          300: "hsl(173 80% 70%)",
          400: "hsl(173 80% 60%)",
          DEFAULT: "hsl(173 80% 40%)", // Your existing primary teal
          500: "hsl(173 80% 40%)",
          600: "hsl(173 80% 30%)",
          700: "hsl(173 80% 20%)",
          800: "hsl(173 80% 10%)",
          900: "hsl(173 80% 5%)",
          950: "hsl(173 80% 2%)",
          foreground: "hsl(210 40% 98%)",
        },
        "logo-emerald": {
          50: "hsl(142 76% 95%)",
          100: "hsl(142 76% 90%)",
          200: "hsl(142 76% 80%)",
          300: "hsl(142 76% 70%)",
          400: "hsl(142 76% 60%)",
          DEFAULT: "hsl(142 76% 65%)", // Your existing secondary emerald
          500: "hsl(142 76% 65%)",
          600: "hsl(142 76% 55%)",
          700: "hsl(142 76% 45%)",
          800: "hsl(142 76% 35%)",
          900: "hsl(142 76% 25%)",
          950: "hsl(142 76% 15%)",
          foreground: "hsl(222.2 47.4% 11.2%)",
        },
        "logo-blue": {
          50: "hsl(210 80% 95%)",
          100: "hsl(210 80% 90%)",
          200: "hsl(210 80% 80%)",
          300: "hsl(210 80% 70%)",
          400: "hsl(210 80% 60%)",
          DEFAULT: "hsl(210 80% 50%)",
          500: "hsl(210 80% 50%)",
          600: "hsl(210 80% 40%)",
          700: "hsl(210 80% 30%)",
          800: "hsl(210 80% 20%)",
          900: "hsl(210 80% 10%)",
          950: "hsl(210 80% 5%)",
          foreground: "hsl(0 0% 100%)",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "calc(1rem - 2px)",
        sm: "calc(1rem - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
