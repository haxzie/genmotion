import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@genmotion/shared",
    "@genmotion/motion",
    "@genmotion/player",
    "@genmotion/compiler",
  ],
};

export default nextConfig;
