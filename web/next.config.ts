import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@tfm/core"],
  serverExternalPackages: ["node:sqlite"],
  allowedDevOrigins: ["192.168.1.134:3000", "192.168.1.134", "localhost:3000", "10.118.53.9", "10.118.53.9:3000"],
};

export default nextConfig;
