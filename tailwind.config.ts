import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
        },
        secondary: "var(--secondary)",
        sidebar: "var(--sidebar)",
        card: "var(--card)",
        "bg-p": "var(--bg-p)",
        "bg-s": "var(--bg-s)",
        "bg-t": "var(--bg-t)",
        "tx-p": "var(--tx-p)",
        "tx-s": "var(--tx-s)",
        "tx-t": "var(--tx-t)",
        "bd-t": "var(--bd-t)",
        "bd-s": "var(--bd-s)",
        "teal-accent": "var(--teal)",
        "teal-bg": "var(--teal-bg)",
        "teal-m": "var(--teal-m)",
        amb: "var(--amb)",
        "amb-bg": "var(--amb-bg)",
        "amb-m": "var(--amb-m)",
        cor: "var(--cor)",
        "cor-bg": "var(--cor-bg)",
        "cor-m": "var(--cor-m)",
        gry: "var(--gry)",
        "gry-bg": "var(--gry-bg)",
        "gry-m": "var(--gry-m)",
        "gry-accent": "var(--gry-accent)",
        pur: "var(--pur)",
        "pur-bg": "var(--pur-bg)",
        "pur-m": "var(--pur-m)",
        blu: "var(--blu)",
        "blu-bg": "var(--blu-bg)",
        "blu-accent": "var(--blu-accent)",
        success: "var(--success)",
        "success-bg": "var(--success-bg)",
        warning: "var(--warning)",
        "warning-bg": "var(--warning-bg)",
        danger: "var(--danger)",
        "danger-bg": "var(--danger-bg)",
        info: "var(--info)",
        "info-bg": "var(--info-bg)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      spacing: {
        header: "var(--header-height)",
        sidebar: "var(--sidebar-width)",
      },
      height: {
        header: "var(--header-height)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
