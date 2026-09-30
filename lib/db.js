import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || '';
const isLocal = /localhost|127\.0\.0\.1/.test(databaseUrl);

// Use Postgres on this machine, and Neon when the URL is remote.
export const sql = isLocal
  ? postgres(databaseUrl, { max: 5 })
  : neon(databaseUrl);

export const usingLocalDatabase = isLocal;
