import { ApiError } from '../middleware/errors.js'
import type { LocationResult } from '../types/report.js'
import { parseCoordinates, roundCoordinate } from '../utils/geo.js'
import { fetchJson } from '../utils/http.js'

type OpenMeteoGeocodeResponse = {
  results?: {
    name: string
    latitude: number
    longitude: number
    country?: string
    admin1?: string
  }[]
}

const seededLocations: Record<string, LocationResult> = {
  delhi: {
    name: 'Delhi',
    latitude: 28.6139,
    longitude: 77.209,
    country: 'India',
    adminRegion: 'Delhi',
    source: 'seed',
  },
  kurukshetra: {
    name: 'Kurukshetra',
    latitude: 29.9695,
    longitude: 76.8783,
    country: 'India',
    adminRegion: 'Haryana',
    source: 'seed',
  },
}

export async function geocodeLocation(query: string): Promise<LocationResult> {
  const trimmed = query.trim()

  if (!trimmed) {
    throw new ApiError(400, 'Location query is required')
  }

  const parsedCoordinates = parseCoordinates(trimmed)

  if (parsedCoordinates) {
    return {
      name: `AOI ${roundCoordinate(parsedCoordinates.latitude)}, ${roundCoordinate(parsedCoordinates.longitude)}`,
      latitude: roundCoordinate(parsedCoordinates.latitude),
      longitude: roundCoordinate(parsedCoordinates.longitude),
      source: 'coordinates',
    }
  }

  const seeded = seededLocations[trimmed.toLowerCase()]
  if (seeded) return seeded

  const params = new URLSearchParams({
    name: trimmed,
    count: '1',
    language: 'en',
    format: 'json',
  })

  const data = await fetchJson<OpenMeteoGeocodeResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
    { timeoutMs: 7000 },
  )
  const result = data.results?.[0]

  if (!result) {
    throw new ApiError(404, `No geocoding result found for "${trimmed}"`)
  }

  return {
    name: result.name,
    latitude: roundCoordinate(result.latitude),
    longitude: roundCoordinate(result.longitude),
    country: result.country,
    adminRegion: result.admin1,
    source: 'open-meteo',
    raw: result,
  }
}
