/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/**/*.{html,js}"
  ],
  darkMode: 'class',
  theme: {
      extend: {
          "colors": {
              "outline-variant": "#414755",
              "primary": "#adc6ff",
              "on-primary": "#002e69",
              "primary-fixed": "#d8e2ff",
              "tertiary-fixed": "#70ff76",
              "primary-container": "#4b8eff",
              "tertiary-container": "#00a82f",
              "background": "#131315",
              "secondary-container": "#464747",
              "on-tertiary-container": "#003208",
              "outline": "#8b90a0",
              "primary-fixed-dim": "#adc6ff",
              "on-error-container": "#ffdad6",
              "surface-tint": "#adc6ff",
              "surface-bright": "#39393b",
              "on-tertiary-fixed-variant": "#005313",
              "tertiary": "#42e355",
              "on-secondary-fixed-variant": "#464747",
              "on-primary-fixed": "#001a41",
              "on-surface-variant": "#c1c6d7",
              "surface": "#131315",
              "surface-variant": "#353437",
              "on-secondary-fixed": "#1b1c1c",
              "on-secondary-container": "#b6b5b5",
              "on-primary-fixed-variant": "#004493",
              "surface-container": "#1f1f21",
              "inverse-primary": "#005bc1",
              "error-container": "#93000a",
              "inverse-on-surface": "#303032",
              "surface-container-highest": "#353437",
              "error": "#ffb4ab",
              "on-primary-container": "#00285c",
              "secondary-fixed-dim": "#c7c6c6",
              "surface-container-low": "#1b1b1d",
              "on-surface": "#e4e2e4",
              "on-tertiary-fixed": "#002204",
              "on-tertiary": "#00390a",
              "surface-dim": "#131315",
              "surface-container-lowest": "#0e0e10",
              "secondary": "#c7c6c6",
              "on-background": "#e4e2e4",
              "secondary-fixed": "#e4e2e2",
              "tertiary-fixed-dim": "#42e355",
              "on-secondary": "#303030",
              "on-error": "#690005",
              "surface-container-high": "#2a2a2c",
              "inverse-surface": "#e4e2e4"
          },
          "borderRadius": {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
          },
          "spacing": {
              "stack-sm": "8px",
              "stack-md": "16px",
              "gutter-fixed": "20px",
              "margin-desktop": "40px",
              "stack-lg": "24px",
              "unit": "4px",
              "margin-mobile": "16px"
          },
          "fontFamily": {
              "display-lg-mobile": ["Inter"],
              "display-lg": ["Inter"],
              "body-lg": ["Inter"],
              "headline-lg-mobile": ["Inter"],
              "label-emphasized": ["Inter"],
              "body-md": ["Inter"],
              "label-sm": ["Inter"],
              "headline-md": ["Inter"],
              "headline-lg": ["Inter"]
          },
          "fontSize": {
              "display-lg-mobile": ["28px", { "lineHeight": "34px", "fontWeight": "700" }],
              "display-lg": ["34px", { "lineHeight": "41px", "letterSpacing": "0.37px", "fontWeight": "700" }],
              "body-lg": ["17px", { "lineHeight": "22px", "letterSpacing": "-0.41px", "fontWeight": "400" }],
              "headline-lg-mobile": ["22px", { "lineHeight": "28px", "fontWeight": "600" }],
              "label-emphasized": ["13px", { "lineHeight": "18px", "letterSpacing": "-0.08px", "fontWeight": "600" }],
              "body-md": ["15px", { "lineHeight": "20px", "letterSpacing": "-0.24px", "fontWeight": "400" }],
              "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0px", "fontWeight": "400" }],
              "headline-md": ["22px", { "lineHeight": "28px", "letterSpacing": "0.35px", "fontWeight": "600" }],
              "headline-lg": ["28px", { "lineHeight": "34px", "letterSpacing": "0.36px", "fontWeight": "600" }]
          }
      }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
