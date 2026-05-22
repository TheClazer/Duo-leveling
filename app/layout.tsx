import type { Metadata, Viewport } from "next";
import { fontSans, fontDisplay, fontMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "The System",
  description: "A private workspace for two. Track life, projects, and growth — together.",
  applicationName: "The System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The System",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a14" },
    { media: "(prefers-color-scheme: light)", color: "#fdf8f2" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="jinwoo"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`}
    >
      <body className="min-h-screen bg-bg-base text-fg antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
