import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('📦 Conectado exitosamente a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en el pool de PostgreSQL:', err);
});