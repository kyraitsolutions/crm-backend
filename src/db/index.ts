import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { Client } from "pg";

import { ENV } from "../constants";

const client = new Client({ connectionString: ENV.DATABASE_URL! });
export async function initDB() {
  try {
    await client.connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1); // exit if DB connection fails
  }
}

export const db = drizzle(client, { schema });
