import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Space_Grotesk } from "next/font/google";

// Geist (sans + mono) is shipped via Vercel's `geist` package, not Google Fonts.
// Its objects expose `.variable` exactly like next/font/google outputs.
export const fontSans = GeistSans;
export const fontMono = GeistMono;

export const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
