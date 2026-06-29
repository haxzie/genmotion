import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __gmPool?: pg.Pool };

const pool =
  globalForDb.__gmPool ??
  new pg.Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://genmotion:genmotion@localhost:5433/genmotion",
  });
globalForDb.__gmPool = pool;

export const db = drizzle(pool, { schema });
export { pool, schema };
