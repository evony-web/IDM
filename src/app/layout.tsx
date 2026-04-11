import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppSettingsProvider } from "@/hooks/useAppSettings";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

// Metadata — app_name is derived from settings API at runtime for the page title,
// but Next.js Metadata API is static. Fallback to env or generic name.
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Esports Tournament Platform";

export const metadata: Metadata = {
  title: `${APP_NAME} | Esports Tournament Platform`,
  description:
    "Premium esports tournament platform. Weekly tournaments, bracket systems, leaderboard, dan competitive gaming experience.",
  keywords: [
    "esports",
    "tournament",
    "gaming",
    "competitive",
    "leaderboard",
    "bracket",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0F" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0B0B0F" />
        <link rel="manifest" href="/api/manifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
          themes={[
            "dark",
            "light",
            // Named theme combinations (division-aware)
            "dark-male",
            "dark-female",
            "light-male",
            "light-female",
          ]}
        >
          <AppSettingsProvider>
            <OfflineIndicator />
            {children}
            <ServiceWorkerRegistration />
            <Toaster />
          </AppSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
