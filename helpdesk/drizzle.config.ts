import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit běží mimo Next.js, takže si .env.local musí načíst sám
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
