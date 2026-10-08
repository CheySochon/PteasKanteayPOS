import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - PteasKanteay POS 60",
  description: "Sign in to PteasKanteay POS 60 Table Management and QR Code Ordering System.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "Login - PteasKanteay POS 60",
    description: "Sign in to PteasKanteay POS 60 Table Management and QR Code Ordering System.",
    url: "/login",
    siteName: "PteasKanteay POS 60",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
