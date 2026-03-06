import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(process.cwd(), "../..");
const apiBaseUrl = process.env.VULCAN_API_BASE_URL ?? "http://127.0.0.1:8787";

const nextConfig: NextConfig = {
  transpilePackages: ["@vulcan/shared"],
  turbopack: {
    root: repoRoot,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
