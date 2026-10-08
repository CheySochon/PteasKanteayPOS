import type { Metadata, Viewport } from "next";
import AuthGuard from "../components/AuthGuard";
import SwRegister from "../components/SwRegister";
import "./globals.css";

const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };
const notoKhmer = { variable: "--font-khmer" };

export const metadata: Metadata = {
  metadataBase: new URL("https://newcastle-paintings-compute-prayer.trycloudflare.com"),
  title: "PteasKanteay POS 60 - Restaurant Point of Sale System",
  description: "PteasKanteay POS 60 - Modern Table Management, Staff Credentials & QR Code Ordering System",
  keywords: ["POS", "PteasKanteay", "Restaurant POS", "QR Ordering", "Table Management", "Cambodia POS"],
  authors: [{ name: "PteasKanteay Team" }],
  openGraph: {
    title: "PteasKanteay POS 60 - Restaurant Point of Sale System",
    description: "PteasKanteay POS 60 - Modern Table Management, Staff Credentials & QR Code Ordering System",
    siteName: "PteasKanteay POS 60",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoKhmer.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#55a060" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Kantumruy+Pro:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <SwRegister />
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
