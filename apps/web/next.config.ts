import type { NextConfig } from "next";

const cluster = process.env.NEXT_PUBLIC_CLUSTER || process.env.VITE_CLUSTER || "devnet";
const rpc = process.env.NEXT_PUBLIC_RPC_URL || process.env.VITE_RPC_URL || "";
const programId = process.env.NEXT_PUBLIC_PROGRAM_ID || process.env.VITE_PROGRAM_ID || "";
const apiBase = process.env.NEXT_PUBLIC_API_BASE || process.env.VITE_API_BASE || "/api";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@coral-xyz/anchor", "@solana/web3.js", "@solana/spl-token"],
  env: {
    NEXT_PUBLIC_CLUSTER: cluster,
    NEXT_PUBLIC_RPC_URL: rpc,
    NEXT_PUBLIC_PROGRAM_ID: programId,
    NEXT_PUBLIC_API_BASE: apiBase,
    ANCHOR_BROWSER: "true",
  },
  async rewrites() {
    const origin = process.env.API_ORIGIN ?? "http://127.0.0.1:5041";
    return [{ source: "/api/:path*", destination: `${origin}/api/:path*` }];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/market.html", destination: "/market", permanent: false },
      { source: "/portfolio.html", destination: "/portfolio", permanent: false },
      { source: "/faucet.html", destination: "/faucet", permanent: false },
      { source: "/docs.html", destination: "/docs", permanent: false },
      { source: "/leaderboard.html", destination: "/leaderboard", permanent: false },
      { source: "/invite.html", destination: "/invite", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = { ...(config.resolve.fallback ?? {}), fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
