/**
 * Color tokens lifted directly from the "Principal Command Center" reference
 * design (Principal Module - Web/Principal Command Center.dc.html). Scoped
 * to this module only — deliberately not merged into the shared design
 * tokens in globals.css, since those are tuned for the Student module's
 * palette (#1d4ed8 primary) and changing them would visually affect Student
 * too. Every Principal component should pull colors from here rather than
 * inlining hex values, so the whole module stays one edit away from a
 * future re-theme.
 */
export const principalColors = {
  bg: "#FFFFFF",
  surfaceMuted: "#F7FAFF",
  surfaceTint: "#F1F6FE",
  border: "#D6E1F5",
  borderMuted: "#EAF0FB",
  borderLight: "#E7EEFA",
  primary: "#1D47AE",
  primaryHover: "#16358A",
  primaryDark: "#12296B",
  chipBorder: "#C1D5F5",
  heading: "#161C27",
  body: "#3A4454",
  textMuted: "#4E596A",
  textFaint: "#6C7889",
  textSubtle: "#8AA0C6",
} as const;

export const principalFontVars = {
  heading: "var(--font-plus-jakarta-sans)",
  body: "var(--font-public-sans)",
  mono: "var(--font-jetbrains-mono)",
} as const;
