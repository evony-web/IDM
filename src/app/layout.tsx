import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSettingsProvider } from "@/hooks/useAppSettings";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { DEFAULT_LOGO_URL } from "@/lib/server-utils";
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

// ── Dynamic Configuration ──
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "IDOL META";
const APP_URL = process.env.NEXTAUTH_URL || "https://idm-tournament.vercel.app";
const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || DEFAULT_LOGO_URL;
const OG_IMAGE_URL = `${APP_URL}/api/og`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050507" },
  ],
};

export const metadata: Metadata = {
  // ── Basic SEO ──
  title: {
    default: `${APP_NAME} — TARKAM Fan Made Tournament`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Premium esports tournament platform. Weekly tournaments, bracket systems, leaderboard, dan competitive gaming experience. Join the community!",

  // ── Keywords ──
  keywords: [
    "esports",
    "tournament",
    "gaming",
    "competitive",
    "leaderboard",
    "bracket",
    "IDOL META",
    "TARKAM",
    "fan made",
    "mobile legends",
  ],

  // ── Authors & Creator ──
  authors: [{ name: APP_NAME, url: APP_URL }],
  creator: APP_NAME,
  publisher: APP_NAME,

  // ── Robots / Crawlers ──
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Open Graph ──
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — TARKAM Fan Made Tournament`,
    description:
      "Premium esports tournament platform. Weekly tournaments, bracket systems, leaderboard, dan competitive gaming experience.",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: `${APP_NAME} Tournament Platform`,
        type: "image/svg+xml",
      },
    ],
  },

  // ── Twitter Card ──
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — TARKAM Fan Made Tournament`,
    description:
      "Premium esports tournament platform. Weekly tournaments, bracket systems, leaderboard, dan competitive gaming experience.",
    images: [OG_IMAGE_URL],
  },

  // ── Icons ──
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: LOGO_URL, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },

  // ── App Links ──
  alternates: {
    canonical: APP_URL,
  },

  // ── PWA ──
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },

  // ── Format Detection ──
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#050507" />
        {/* Preconnect to Cloudinary CDN for faster image loading */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        style={{ background: '#050507' }}
      >
        <AuthProvider>
          <AppSettingsProvider>
            <OfflineIndicator />
            {children}
            <ServiceWorkerRegistration />
            <Toaster />
          </AppSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
