import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@genmotion/shared",
    "@genmotion/motion",
    "@genmotion/player",
    "@genmotion/compiler",
  ],
  async redirects() {
    return [
      // Projects were merged into the app home (alongside the create composer).
      { source: "/projects", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
