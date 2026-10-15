import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users } from '../db/schema';

async function main(){
  const url=process.env.DATABASE_URL;
  if(!url) throw new Error('Set DATABASE_URL before creating an administrator.');
  const email=process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password=process.env.ADMIN_PASSWORD;
  const name=process.env.ADMIN_NAME||'System Owner';
  if(!email||!password||password.length<12) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).');
  const pool=new Pool({connectionString:url});
  try { const db=drizzle({client:pool}); const passwordHash=await bcrypt.hash(password,12); await db.insert(users).values({name,email,passwordHash,role:'owner'}); console.log(`Created owner account: ${email}`); }
  finally { await pool.end(); }
}
main().catch(e=>{console.error(e.message);process.exit(1)});
