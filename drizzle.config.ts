// drizzle-kit reads the schema and writes SQL migrations for D1 into migrations/.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./worker/db/schema.ts",
  out: "./migrations",
});
