import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (PPR) jsou vědomě vypnuté — stejně jako u helpdesku.
  //
  // Část aplikace je per-user dynamická (administrace a část pro recenzenty
  // čtou session cookie), část je naopak čistě veřejná. Hranice mezi tím je
  // ale jasná a malá, takže se nevyplatí platit Suspense ceremonií okolo
  // každé stránky. Katalog se místo toho cachuje přes `revalidate` na úrovni
  // route a /api/index má vlastní ETag.
  cacheComponents: false,
  partialPrefetching: false,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
