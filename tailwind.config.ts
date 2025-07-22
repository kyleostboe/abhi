import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
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
        // Custom colors for abhī
        "logo-amber": {
          DEFAULT: "#FFBF00", // Amber
          50: "#FFF8E6",
          100: "#FFF2CC",
          200: "#FFE699",
          300: "#FFD966",
          400: "#FFCC33",
          500: "#FFBF00",
          600: "#E6AC00",
          700: "#B38600",
          800: "#806000",
          900: "#4D3900",
          950: "#332600",
        },
        "logo-rose": {
          DEFAULT: "#E0115F", // Rose
          50: "#FCE4EC",
          100: "#F8BBD0",
          200: "#F48FB1",
          300: "#F06292",
          400: "#EC407A",
          500: "#E91E63",
          600: "#D81B60",
          700: "#C2185B",
          800: "#AD1457",
          900: "#880E4F",
          950: "#5C0935",
        },
        "logo-purple": {
          DEFAULT: "#8A2BE2", // Blue Violet / Purple
          50: "#F5F0FF",
          100: "#EBE0FF",
          200: "#D6BFFF",
          300: "#C29FFF",
          400: "#AD80FF",
          500: "#9966FF",
          600: "#8A2BE2", // Original Blue Violet
          700: "#7A24CC",
          800: "#6B1DA6",
          900: "#5C1680",
          950: "#3D0F53",
        },
        "logo-teal": {
          DEFAULT: "#008080", // Teal
          50: "#E0FFFF",
          100: "#B2FFFF",
          200: "#80FFFF",
          300: "#4DFFFF",
          400: "#1AFFFF",
          500: "#00CCCC",
          600: "#00B3B3",
          700: "#008080",
          800: "#004D4D",
          900: "#001A1A",
          950: "#000D0D",
        },
        "logo-emerald": {
          DEFAULT: "#50C878", // Emerald
          50: "#EDFBF1",
          100: "#D6F5E0",
          200: "#B3EDC2",
          300: "#8CE4A3",
          400: "#66DB85",
          500: "#40D266",
          600: "#33B352",
          700: "#268F3E",
          800: "#1A6B2B",
          900: "#0D4718",
          950: "#072B0C",
        },
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
