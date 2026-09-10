import type { NextConfig } from "next";

// Set by the deploy workflow from configure-pages' base_path output. It is ""
// for a <user>.github.io repo and "/<repo>" for any other name — so the site
// works whatever the artist calls their repository, instead of 404-ing every
// asset the moment they name it "portfolio".
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  // GitHub Pages serves static files only. Every route is prerendered.
  output: "export",
  // Pages serves /about as /about/index.html, so emit directories.
  trailingSlash: true,
  // next/image is deliberately unused — the sync script pre-generates AVIF
  // width variants and the gallery renders a plain <img srcset>.
  images: { unoptimized: true },
};

export default nextConfig;
