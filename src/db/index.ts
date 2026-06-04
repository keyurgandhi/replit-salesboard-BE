import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}
console.log("DB URL ---- ",process.env.DATABASE_URL);

// export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // ADD THE FIX HERE:
  ssl: {
    // Tells the Node app to encrypt data without requiring a local physical certificate file
    rejectUnauthorized: false 
  }
});
export const db = drizzle(pool, { schema });

export * from "./schema";
