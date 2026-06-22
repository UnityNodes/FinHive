import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  env: {
    DAML_LEDGER_URL: process.env.DAML_LEDGER_URL,
    DAML_OPERATOR_PARTY: process.env.DAML_OPERATOR_PARTY,
    DOMAIN: process.env.DOMAIN,
  },
};

export default nextConfig;
