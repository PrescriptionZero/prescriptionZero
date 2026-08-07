import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string(),
  PROOF_SERVER_URL: z.string().url(),
  MIDNIGHT_NETWORK: z.string().default('preview'),
  CONTRACT_ADDRESS: z.string().default(''),
});

export const env = envSchema.parse(process.env);