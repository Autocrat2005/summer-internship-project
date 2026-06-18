import { seededDisasters } from '../data/disasters.js'
import { prisma, safeDb } from '../db/prisma.js'
import type { Coordinates, DisasterResult } from '../types/report.js'
import { distanceKm } from '../utils/geo.js'
import { fetchJson } from '../utils/http.js'

type EonetResponse = {
  events?: {
    title: string
    categories?: { title: string }[]
    geometry?: { date?: string; coordinates?: [number, number] }[]
  }[]
}

type UsgsEarthquakeResponse = {
  features?: {
    properties?: {
      title?: string
      mag?: number
      time?: number
      place?: string
    }
    geometry?: {
      coordinates?: [number, number, number]
    }
  }[]
}

type GdacsResponse = {
  features?: {
    properties?: {
      name?: string
      eventname?: string
      eventtype?: string
      alertlevel?: string
      fromdate?: string
      country?: string
    }
    geometry?: {
      type?: string
      coordinates?: unknown
    }
  }[]
}

export async function getDisasters(coordinates: Coordinates): Promise<DisasterResult[]> {
  const [seeded, eonet, earthquakes, gdacs] = await Promise.all([
    Promise.resolve(getSeededNearby(coordinates)),
    getEonetEvents(coordinates),
    getEarthquakes(coordinates),
    getGdacsEvents(coordinates),
  ])

  const events = [...seeded, ...gdacs, ...eonet, ...earthquakes].slice(0, 8)
  await persistDisasters(events)
  return events
}

function getSeededNearby(coordinates: Coordinates) {
  return seededDisasters
    .filter((event) => {
      if (event.latitude === undefined || event.longitude === undefined) return false
      return distanceKm(coordinates, { latitude: event.latitude, longitude: event.longitude }) <= 350
    })
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
}

async function getEonetEvents(coordinates: Coordinates) {
  try {
    const data = await fetchJson<EonetResponse>(
      'https://eonet.gsfc.nasa.gov/api/v3/events?status=all&limit=60',
      { timeoutMs: 8000 },
    )

    return (data.events ?? [])
      .flatMap<DisasterResult>((event) => {
        const geometry = event.geometry?.find((item) => Array.isArray(item.coordinates))
        const point = geometry?.coordinates
        if (!point) return []

        const [longitude, latitude] = point
        if (distanceKm(coordinates, { latitude, longitude }) > 600) return []

        return [
          {
            name: event.title,
            type: event.categories?.[0]?.title ?? 'Natural Event',
            year: geometry?.date ? new Date(geometry.date).getFullYear() : undefined,
            severity: 'Medium',
            reason: 'NASA EONET reported an event within the search radius.',
            source: 'NASA EONET',
            latitude,
            longitude,
          },
        ]
      })
      .slice(0, 4)
  } catch {
    return []
  }
}

async function getEarthquakes(coordinates: Coordinates) {
  const start = new Date()
  start.setFullYear(start.getFullYear() - 6)
  const params = new URLSearchParams({
    format: 'geojson',
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    maxradiuskm: '500',
    minmagnitude: '4.5',
    starttime: start.toISOString().slice(0, 10),
    orderby: 'time',
    limit: '5',
  })

  try {
    const data = await fetchJson<UsgsEarthquakeResponse>(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`,
      { timeoutMs: 8000 },
    )

    return (data.features ?? []).flatMap<DisasterResult>((feature) => {
      const coordinates = feature.geometry?.coordinates
      if (!coordinates) return []

      const magnitude = feature.properties?.mag ?? 0
      return [
        {
          name: feature.properties?.title ?? 'Earthquake',
          type: 'Earthquake',
          year: feature.properties?.time ? new Date(feature.properties.time).getFullYear() : undefined,
          severity: magnitude >= 6 ? 'High' : 'Medium',
          reason: feature.properties?.place ?? `Magnitude ${magnitude} seismic event.`,
          source: 'USGS Earthquake API',
          longitude: coordinates[0],
          latitude: coordinates[1],
        },
      ]
    })
  } catch {
    return []
  }
}

async function getGdacsEvents(coordinates: Coordinates) {
  const to = new Date()
  const from = new Date()
  from.setFullYear(from.getFullYear() - 1)
  const params = new URLSearchParams({
    eventlist: 'EQ;TC;FL;VO;WF;DR',
    fromdate: from.toISOString().slice(0, 10),
    todate: to.toISOString().slice(0, 10),
    alertlevel: 'green;orange;red',
  })

  try {
    const data = await fetchJson<GdacsResponse>(
      `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?${params.toString()}`,
      { timeoutMs: 9000 },
    )

    return (data.features ?? [])
      .flatMap<DisasterResult>((feature) => {
        const point = extractGeometryPoint(feature.geometry?.coordinates)
        if (!point) return []
        if (distanceKm(coordinates, point) > 700) return []

        const alert = feature.properties?.alertlevel?.toLowerCase()
        const severity = alert === 'red' ? 'High' : alert === 'orange' ? 'Medium' : 'Low'
        const date = feature.properties?.fromdate

        return [
          {
            name: feature.properties?.eventname ?? feature.properties?.name ?? 'GDACS event',
            type: feature.properties?.eventtype ?? 'Multi-hazard alert',
            year: date ? new Date(date).getFullYear() : undefined,
            severity,
            reason: `GDACS ${feature.properties?.alertlevel ?? 'alert'} alert near ${feature.properties?.country ?? 'the area'}.`,
            source: 'GDACS',
            latitude: point.latitude,
            longitude: point.longitude,
          },
        ]
      })
      .slice(0, 4)
  } catch {
    return []
  }
}

function extractGeometryPoint(coordinates: unknown): Coordinates | null {
  if (!Array.isArray(coordinates)) return null

  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    return {
      longitude: coordinates[0],
      latitude: coordinates[1],
    }
  }

  return extractGeometryPoint(coordinates[0])
}

async function persistDisasters(events: DisasterResult[]) {
  await Promise.all(
    events.map((event) =>
      safeDb(() =>
        prisma!.disasterEvent.create({
          data: {
            name: event.name,
            type: event.type,
            year: event.year,
            severity: event.severity,
            reason: event.reason,
            source: event.source,
            latitude: event.latitude,
            longitude: event.longitude,
            rawPayload: event as object,
          },
        }),
      ),
    ),
  )
}
