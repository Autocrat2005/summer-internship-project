import { prisma, safeDb } from '../db/prisma.js'
import type { LocationResult } from '../types/report.js'

const memoryLocations = new Map<string, LocationResult>()

export async function listLocations() {
  const rows = await safeDb(() =>
    prisma!.location.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  )

  if (rows) {
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      country: row.country,
      adminRegion: row.adminRegion,
      source: row.source,
    }))
  }

  return Array.from(memoryLocations.values())
}

export async function saveLocation(location: LocationResult) {
  const row = await safeDb(() =>
    prisma!.location.create({
      data: {
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        country: location.country,
        adminRegion: location.adminRegion,
        source: location.source,
        rawPayload: location.raw === undefined ? undefined : (location.raw as object),
      },
    }),
  )

  if (row) return row

  const key = `${location.name}:${location.latitude}:${location.longitude}`
  memoryLocations.set(key, location)
  return location
}
