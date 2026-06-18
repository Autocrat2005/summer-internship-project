import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional(),
  FRONTEND_ORIGIN: z.string().default('http://127.0.0.1:5173,http://localhost:5173'),
  REPORT_CACHE_TTL_MINUTES: z.coerce.number().int().positive().default(60),
})

const parsed = envSchema.parse(process.env)

export const env = {
  ...parsed,
  allowedOrigins: parsed.FRONTEND_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseEnabled: Boolean(parsed.DATABASE_URL),
}
