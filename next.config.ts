import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Seeded mock wardrobe photos (scripts/seedMockWardrobe.ts).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" }],
  },
};

export default nextConfig;
