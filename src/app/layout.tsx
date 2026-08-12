import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/lib/providers/AppProviders";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Used by the Principal module only (its reference design pairs Plus Jakarta
// Sans headings with Public Sans body text) — every other module keeps using
// --font-sans (Plus Jakarta Sans) as its body font, unaffected by this addition.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "EOS Student Portal",
  description: "Sri Eshwar College of Engineering — Student Portal",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${publicSans.variable} ${jetBrainsMono.variable}`}>
      <head>
        {/*
          next/font can't express Material Symbols' variable axes (opsz/wght/FILL/GRAD), so this is a plain
          <link> instead — it lives in the root layout, so (unlike the Pages Router concern this lint rule
          is designed for) it already applies to every route. `block` instead of `swap` is intentional: this
          is a ligature icon font, so a fallback-font "swap" period would flash literal icon names like
          "grid_view" as visible text.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
