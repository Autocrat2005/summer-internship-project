import { env } from '../config/env.js'
import { prisma, safeDb } from '../db/prisma.js'
import type { DashboardReport, LocationResult, ReportWarnings } from '../types/report.js'
import { classifyLocation } from './classificationService.js'
import { getClimate } from './climateService.js'
import { getDisasters } from './disasterService.js'
import { getFarmingSuitability } from './farmingService.js'
import { geocodeLocation } from './geocodeService.js'
import { saveLocation } from './locationService.js'
import { getSatellite } from './satelliteService.js'

export async function buildReport(query: string): Promise<DashboardReport> {
  const cacheKey = normalizeCacheKey(query)
  const cached = await readCache(cacheKey)
  if (cached) return { ...cached, cached: true }

  const warnings: ReportWarnings = []
  const location = await geocodeLocation(query)
  await saveLocation(location)

  const [climate, satellite, disasters] = await Promise.all([
    withWarning('climate', warnings, () => getClimate(location), fallbackClimate(location)),
    withWarning('satellite', warnings, () => getSatellite(location), fallbackSatellite(location)),
    withWarning('disasters', warnings, () => getDisasters(location), []),
  ])

  const classification = await withWarning(
    'classification',
    warnings,
    () => classifyLocation(location, climate),
    fallbackClassification(location),
  )
  const farming = await withWarning(
    'farming',
    warnings,
    () => getFarmingSuitability(climate, classification),
    fallbackFarming(),
  )
  collectFallbackWarning('climate', climate.source, warnings)
  collectFallbackWarning('satellite', satellite.source, warnings)
  collectFallbackWarning('classification', classification.source, warnings)
  collectFallbackWarning('farming', farming.source, warnings)

  const report: DashboardReport = {
    generatedAt: new Date().toISOString(),
    query,
    location,
    satellite,
    classification,
    climate,
    farming,
    disasters,
    explanation: {
      summary: `${location.name} is classified as ${classification.landCoverLabel.toLowerCase()} in a ${classification.regionType.toLowerCase()} setting.`,
      farming:
        farming.recommendations[0] !== undefined
          ? `${farming.recommendations[0].cropName} is the strongest MVP crop recommendation with a score of ${farming.recommendations[0].score}/100.`
          : 'No strong crop recommendation was produced for this location.',
      disaster:
        disasters[0] !== undefined
          ? `${disasters[0].name} is the top nearby disaster signal, mainly due to ${disasters[0].reason.toLowerCase()}`
          : 'No nearby disaster signal was found in the configured public and seeded datasets.',
    },
    warnings,
    cached: false,
  }

  await writeCache(cacheKey, report)
  return report
}

function collectFallbackWarning(service: string, source: string, warnings: ReportWarnings) {
  if (source.toLowerCase().includes('fallback')) {
    warnings.push({
      service,
      message: `${service} used a fallback data source`,
    })
  }
}

async function withWarning<T>(
  service: string,
  warnings: ReportWarnings,
  operation: () => Promise<T>,
  fallback: T,
) {
  try {
    return await operation()
  } catch (error) {
    warnings.push({
      service,
      message: error instanceof Error ? error.message : `${service} service failed`,
    })
    return fallback
  }
}

function normalizeCacheKey(query: string) {
  return query.trim().toLowerCase()
}

async function readCache(key: string) {
  const row = await safeDb(() =>
    prisma!.reportCache.findUnique({
      where: { query: key },
    }),
  )

  if (!row || row.expiresAt < new Date()) return null
  return row.payload as DashboardReport
}

async function writeCache(key: string, report: DashboardReport) {
  const expiresAt = new Date(Date.now() + env.REPORT_CACHE_TTL_MINUTES * 60 * 1000)

  await safeDb(() =>
    prisma!.reportCache.upsert({
      where: { query: key },
      update: { payload: report as object, expiresAt },
      create: { query: key, payload: report as object, expiresAt },
    }),
  )
}

function fallbackClimate(location: LocationResult) {
  const tropical = Math.abs(location.latitude) < 30
  return {
    source: 'Report fallback climate',
    temperature: tropical ? 30 : 22,
    humidity: tropical ? 62 : 48,
    rainfall: tropical ? 110 : 65,
    pressure: 1007,
    windSpeed: 8,
    warmingIndex: 1.2,
    history: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((label, index) => ({
      label,
      temperature: tropical ? 28 + index * 0.4 : 19 + index * 0.3,
      rainfall: tropical ? 80 + index * 8 : 44 + index * 4,
    })),
  }
}

function fallbackSatellite(location: LocationResult) {
  const bbox = [
    location.longitude - 0.18,
    location.latitude - 0.18,
    location.longitude + 0.18,
    location.latitude + 0.18,
  ].join(',')
  const layer = 'MODIS_Terra_CorrectedReflectance_TrueColor'

  return {
    source: 'NASA GIBS fallback',
    gibs: {
      service: 'NASA GIBS WMS',
      layer,
      projection: 'EPSG:4326',
      tileMatrixSet: '250m',
      tileTemplate:
        'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/{date}/250m/{z}/{y}/{x}.jpg',
      previewUrl:
        `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0` +
        `&LAYERS=${layer}&CRS=EPSG:4326&FORMAT=image/jpeg&WIDTH=900&HEIGHT=520&BBOX=${bbox}`,
    },
    scenes: [],
  }
}

function fallbackClassification(location: LocationResult) {
  const urban = location.name.toLowerCase().includes('delhi')
  return {
    source: 'Report fallback classification',
    landCoverCode: urban ? 50 : 40,
    landCoverLabel: urban ? 'Built-up' : 'Cropland',
    regionType: 'Alluvial plain',
    urbanRural: urban ? 'Urban' : 'Peri-urban / agricultural',
    elevationMeters: null,
    confidence: 64,
    ndviProxy: urban ? 0.28 : 0.62,
    explanation: 'Fallback classification generated from location context.',
  }
}

function fallbackFarming() {
  return {
    source: 'Report fallback crop recommendation',
    suitable: true,
    score: 72,
    recommendations: [
      {
        cropName: 'Wheat',
        season: 'Rabi',
        score: 72,
        suitable: true,
        reasons: ['Fallback recommendation for plains with moderate rainfall.'],
      },
    ],
    reasons: ['Fallback generated because the farming service was unavailable.'],
  }
}
