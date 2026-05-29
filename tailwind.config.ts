import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tertiary": "#c0ceec",
        "primary-container": "#d4af37",
        "on-surface-variant": "#d0c5af",
        "on-primary": "#3c2f00",
        "inverse-surface": "#e5e2e1",
        "error": "#ffb4ab",
        "tertiary-fixed": "#d6e3ff",
        "on-primary-fixed-variant": "#574500",
        "on-background": "#e5e2e1",
        "surface-container-high": "#2a2a2a",
        "on-primary-container": "#554300",
        "primary": "#f2ca50",
        "inverse-on-surface": "#313030",
        "on-primary-fixed": "#241a00",
        "secondary": "#c6c6c7",
        "secondary-container": "#454747",
        "primary-fixed": "#ffe088",
        "on-secondary": "#2f3131",
        "surface-variant": "#353535",
        "on-secondary-fixed-variant": "#454747",
        "on-tertiary-fixed-variant": "#39475f",
        "on-error": "#690005",
        "surface-tint": "#e9c349",
        "surface": "#131313",
        "on-tertiary-fixed": "#0d1c32",
        "inverse-primary": "#735c00",
        "secondary-fixed": "#e2e2e2",
        "tertiary-fixed-dim": "#b9c7e4",
        "surface-container-highest": "#353535",
        "outline": "#99907c",
        "surface-dim": "#131313",
        "on-secondary-fixed": "#1a1c1c",
        "surface-container": "#20201f",
        "background": "#131313",
        "primary-fixed-dim": "#e9c349",
        "outline-variant": "#4d4635",
        "error-container": "#93000a",
        "tertiary-container": "#a5b3d0",
        "on-tertiary-container": "#38455d",
        "surface-container-lowest": "#0e0e0e",
        "on-secondary-container": "#b4b5b5",
        "on-error-container": "#ffdad6",
        "surface-bright": "#393939",
        "secondary-fixed-dim": "#c6c6c7",
        "on-tertiary": "#233148",
        "on-surface": "#e5e2e1",
        "surface-container-low": "#1c1b1b"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "base": "8px",
        "container-padding-desktop": "64px",
        "card-gap": "32px",
        "container-padding-mobile": "24px",
        "gutter": "24px"
      },
      fontFamily: {
        "headline-md": ["Inter", "sans-serif"],
        "headline-lg-mobile": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "label-lg": ["Inter", "sans-serif"],
        "display-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [forms, containerQueries],
};

export default config;
