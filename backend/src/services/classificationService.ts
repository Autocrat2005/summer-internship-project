import { getLandCoverLabel } from '../data/landCover.js'
import { prisma, safeDb } from '../db/prisma.js'
import type { ClassificationResult, ClimateResult, Coordinates, LocationResult } from '../types/report.js'
import { fetchJson } from '../utils/http.js'

type ElevationResponse = {
  elevation?: number[]
}

export async function classifyLocation(
  location: LocationResult,
  climate: ClimateResult,
): Promise<ClassificationResult> {
  const elevationMeters = await getElevation(location)
  const landCoverCode = estimateLandCoverCode(location, climate, elevationMeters)
  const landCoverLabel = getLandCoverLabel(landCoverCode)
  const regionType = getRegionType(elevationMeters, climate, landCoverCode)
  const urbanRural = getUrbanRural(location, landCoverCode)
  const confidence = getConfidence(location, climate, elevationMeters, landCoverCode)
  const ndviProxy = getNdviProxy(landCoverCode, climate)

  const result: ClassificationResult = {
    source: 'ESA WorldCover-informed rule engine + Open-Meteo elevation',
    landCoverCode,
    landCoverLabel,
    regionType,
    urbanRural,
    elevationMeters,
    confidence,
    ndviProxy,
    explanation: `${landCoverLabel} classified as ${regionType.toLowerCase()} with ${urbanRural.toLowerCase()} settlement characteristics.`,
  }

  await persistClassification(result)
  return result
}

async function getElevation(coordinates: Coordinates) {
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
  })

  try {
    const data = await fetchJson<ElevationResponse>(`https://api.open-meteo.com/v1/elevation?${params.toString()}`, {
      timeoutMs: 7000,
    })
    const elevation = data.elevation?.[0]
    return typeof elevation === 'number' ? Math.round(elevation) : null
  } catch {
    return null
  }
}

function estimateLandCoverCode(location: LocationResult, climate: ClimateResult, elevation: number | null) {
  const name = location.name.toLowerCase()
  const rainfall = climate.rainfall ?? 80
  const temp = climate.temperature ?? 26

  if (name.includes('delhi') || name.includes('mumbai') || name.includes('kolkata')) return 50
  if (rainfall > 145 && temp > 24) return 40
  if (rainfall > 170) return 90
  if (elevation !== null && elevation > 1600) return 30
  if (rainfall < 35 && temp > 28) return 60
  if (rainfall > 95) return 40
  return 30
}

function getRegionType(elevation: number | null, climate: ClimateResult, landCoverCode: number) {
  const rainfall = climate.rainfall ?? 80

  if (elevation !== null && elevation > 1600) return 'Mountain'
  if (elevation !== null && elevation > 650) return 'Plateau'
  if (landCoverCode === 60 || rainfall < 35) return 'Desert / dryland'
  if (landCoverCode === 90 || rainfall > 150) return 'Riverine plain'
  return 'Alluvial plain'
}

function getUrbanRural(location: LocationResult, landCoverCode: number) {
  const name = location.name.toLowerCase()

  if (landCoverCode === 50) return 'Urban'
  if (name.includes('basin') || name.includes('aoi')) return 'Rural'
  return landCoverCode === 40 ? 'Peri-urban / agricultural' : 'Rural'
}

function getConfidence(
  location: LocationResult,
  climate: ClimateResult,
  elevation: number | null,
  landCoverCode: number,
) {
  let confidence = 68
  if (location.source !== 'coordinates') confidence += 8
  if (climate.source.includes('Open-Meteo')) confidence += 10
  if (elevation !== null) confidence += 7
  if ([40, 50, 90].includes(landCoverCode)) confidence += 5
  return Math.min(94, confidence)
}

function getNdviProxy(landCoverCode: number, climate: ClimateResult) {
  const baseByClass: Record<number, number> = {
    10: 0.78,
    20: 0.44,
    30: 0.5,
    40: 0.66,
    50: 0.28,
    60: 0.18,
    80: 0.08,
    90: 0.72,
  }
  const rainfallBoost = Math.min(0.12, Math.max(-0.08, ((climate.rainfall ?? 80) - 80) / 1000))
  return Math.round(((baseByClass[landCoverCode] ?? 0.42) + rainfallBoost) * 100) / 100
}

async function persistClassification(result: ClassificationResult) {
  await safeDb(() =>
    prisma!.landClassification.create({
      data: {
        landCoverCode: result.landCoverCode,
        landCoverLabel: result.landCoverLabel,
        regionType: result.regionType,
        urbanRural: result.urbanRural,
        elevationMeters: result.elevationMeters,
        confidence: result.confidence,
        rawPayload: result as object,
      },
    }),
  )
}
