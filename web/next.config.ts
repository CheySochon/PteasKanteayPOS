import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: http://localhost:4000 http://127.0.0.1:4000 https: http:; connect-src 'self' http://localhost:4000 ws://localhost:4000 http://127.0.0.1:4000 ws://127.0.0.1:4000 http://localhost:3000 ws://localhost:3000 http://127.0.0.1:3000 ws://127.0.0.1:3000 https://pteaskanteaypos.onrender.com wss://pteaskanteaypos.onrender.com https://api.telegram.org https: http: ws: wss:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self';",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["*.trycloudflare.com", "localhost:3000", "127.0.0.1:3000"],
  async rewrites() {
    let dest = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    if (!dest.startsWith("http://") && !dest.startsWith("https://")) {
      dest = `https://${dest}`;
    }
    if (!dest.endsWith("/api")) {
      dest = `${dest.replace(/\/$/, "")}/api`;
    }
    return [
      {
        source: "/api/((?!send-otp).*)",
        destination: `${dest}/:1`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
