import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

async function testQueries() {
  const allUsers = await db.select().from(users).where(eq(users.roleId, 1));
  console.log(allUsers);
}

testQueries();
