import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@/db/schema';

const url = process.env.DATABASE_URL;
if (!url && process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production.');
// Use the Pool driver for Node.js route handlers so critical inventory operations can use SQL transactions.
export const pool = url ? new Pool({ connectionString: url }) : null;
export const db = pool ? drizzle({ client: pool, schema }) : null;
