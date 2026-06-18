import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

export const prisma = env.databaseEnabled ? new PrismaClient() : null

export async function safeDb<T>(operation: () => Promise<T>) {
  if (!prisma) return null

  try {
    return await operation()
  } catch {
    return null
  }
}
