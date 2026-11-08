import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (PPR) jsou vědomě vypnuté.
  //
  // Každá stránka téhle aplikace je per-user dynamická: čte session cookie
  // a podle ní sahá do databáze. Není tu nic, co by se dalo prerenderovat
  // do statické skořápky, takže by zapnuté Cache Components znamenaly jen
  // Suspense hranice a "use cache: private" ceremonii okolo každé stránky
  // za nulový přínos — a byly by zdrojem matoucích build errorů při dalších
  // úpravách. Viz node_modules/next/dist/docs/01-app/02-guides/
  // caching-without-cache-components.md, kde je tento režim popsaný.
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
