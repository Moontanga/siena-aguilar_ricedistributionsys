
import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!url) throw new Error("DATABASE_URL is missing.");
  if (!email) throw new Error("ADMIN_EMAIL is missing.");
  if (!password || password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  if (email !== "jaguilar29@gmail.com") {
    throw new Error("This reset script is restricted to the intended owner account.");
  }

  const pool = new Pool({ connectionString: url });

  try {
    const db = drizzle({ client: pool });
    const passwordHash = await bcrypt.hash(password, 12);

    const updated = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, email))
      .returning({ email: users.email });

    if (updated.length !== 1) {
      throw new Error(
        `Expected to update one existing account, but updated ${updated.length}.`
      );
    }

    console.log(`Password reset successfully for ${updated[0].email}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Password reset failed:", error);
  process.exitCode = 1;
});
