import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleBetter } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use SQLite for development/demo, Neon for production
if (process.env.DATABASE_URL.startsWith('file:')) {
  const sqlite = new Database(process.env.DATABASE_URL.replace('file:', ''));
  export const db = drizzleBetter(sqlite, { schema });
  export { sqlite as pool };
} else {
  export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  export const db = drizzleNeon({ client: pool, schema });
}
