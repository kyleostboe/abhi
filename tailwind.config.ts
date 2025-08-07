import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "*.{js,ts,jsx,tsx,mdx}"],
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
        // Custom colors for the logo and gradients
        'logo-amber': '#FFBF00', // Amber
        'logo-rose': '#E0115F',  // Rose
        'logo-purple': '#8A2BE2', // Blue Violet / Purple
        'logo-teal': '#008080',  // Teal

        // Specific shades for gradients and text
        'logo-amber-400': 'rgb(255 191 0 / 0.2)',
        'logo-rose-300': 'rgb(253 164 175 / 0.15)',
        'logo-purple-400': 'rgb(192 132 252 / 0.1)',
        'logo-teal-300': 'rgb(94 234 212 / 0.2)',

        'logo-amber-600': '#CC9900',
        'logo-rose-600': '#E0115F',
        'logo-purple-600': '#5E35B1',
        'logo-teal-600': '#006666',
        'logo-emerald-600': '#047857',

        'logo-amber-700': '#CC9900',
        'logo-rose-700': '#C2185B',
        'logo-purple-700': '#5E35B1',
        'logo-teal-700': '#004D4D',
        'logo-emerald-700': '#065F46',

        'logo-teal-800': '#003333',
        'logo-emerald-800': '#044F3A',

        'logo-teal-50': '#E0FFFF',
        'logo-emerald-50': '#ECFDF5',

        'logo-teal-950': '#001A1A',
        'logo-emerald-950': '#021C15',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
