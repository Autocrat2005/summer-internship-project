import { Router } from 'express'
import { z } from 'zod'
import { classifyLocation } from '../services/classificationService.js'
import { getClimate } from '../services/climateService.js'
import { getDisasters } from '../services/disasterService.js'
import { getFarmingSuitability } from '../services/farmingService.js'
import { geocodeLocation } from '../services/geocodeService.js'
import { listLocations, saveLocation } from '../services/locationService.js'
import { buildReport } from '../services/reportService.js'
import { getSatellite } from '../services/satelliteService.js'
import type { Coordinates, LocationResult } from '../types/report.js'

export const apiRouter = Router()

const querySchema = z.object({
  query: z.string().min(1),
})

const coordinateQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
})

const locationBodySchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country: z.string().optional(),
  adminRegion: z.string().optional(),
})

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'geospatial-intelligence-backend',
    timestamp: new Date().toISOString(),
  })
})

apiRouter.get('/geocode', async (req, res, next) => {
  try {
    const { query } = querySchema.parse(req.query)
    res.json(await geocodeLocation(query))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/locations', async (_req, res, next) => {
  try {
    res.json(await listLocations())
  } catch (error) {
    next(error)
  }
})

apiRouter.post('/locations', async (req, res, next) => {
  try {
    const body = locationBodySchema.parse(req.body)
    const location: LocationResult = {
      ...body,
      source: 'user',
    }
    res.status(201).json(await saveLocation(location))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/satellite', async (req, res, next) => {
  try {
    res.json(await getSatellite(parseCoordinatesQuery(req.query)))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/climate', async (req, res, next) => {
  try {
    res.json(await getClimate(parseCoordinatesQuery(req.query)))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/classification', async (req, res, next) => {
  try {
    const coordinates = parseCoordinatesQuery(req.query)
    const climate = await getClimate(coordinates)
    const location: LocationResult = {
      name: `AOI ${coordinates.latitude}, ${coordinates.longitude}`,
      ...coordinates,
      source: 'coordinates',
    }
    res.json(await classifyLocation(location, climate))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/farming', async (req, res, next) => {
  try {
    const coordinates = parseCoordinatesQuery(req.query)
    const climate = await getClimate(coordinates)
    const location: LocationResult = {
      name: `AOI ${coordinates.latitude}, ${coordinates.longitude}`,
      ...coordinates,
      source: 'coordinates',
    }
    const classification = await classifyLocation(location, climate)
    res.json(await getFarmingSuitability(climate, classification))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/disasters', async (req, res, next) => {
  try {
    res.json(await getDisasters(parseCoordinatesQuery(req.query)))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/report', async (req, res, next) => {
  try {
    const { query } = querySchema.parse(req.query)
    res.json(await buildReport(query))
  } catch (error) {
    next(error)
  }
})

function parseCoordinatesQuery(query: unknown): Coordinates {
  const parsed = coordinateQuerySchema.parse(query)
  return {
    latitude: parsed.lat,
    longitude: parsed.lon,
  }
}
