import { prisma, safeDb } from '../db/prisma.js'
import type { ClimateHistoryPoint, ClimateResult, Coordinates } from '../types/report.js'
import { fetchJson } from '../utils/http.js'

type OpenMeteoForecastResponse = {
  current?: {
    temperature_2m?: number
    relative_humidity_2m?: number
    precipitation?: number
    pressure_msl?: number
    wind_speed_10m?: number
  }
  daily?: {
    time?: string[]
    precipitation_sum?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
  }
}

type NasaPowerResponse = {
  properties?: {
    parameter?: {
      T2M?: Record<string, number>
      PRECTOTCORR?: Record<string, number>
      RH2M?: Record<string, number>
    }
  }
}

export async function getClimate(coordinates: Coordinates): Promise<ClimateResult> {
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    current: 'temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m',
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    past_days: '7',
    forecast_days: '1',
  })

  try {
    const forecast = await fetchJson<OpenMeteoForecastResponse>(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { timeoutMs: 8000 },
    )
    const climatology = await getPowerClimatology(coordinates)
    const history = buildForecastHistory(forecast, climatology)
    const current = forecast.current ?? {}
    const annualRainfall = average(history.map((point) => point.rainfall).filter(isNumber))

    const climate: ClimateResult = {
      source: 'Open-Meteo Forecast API + NASA POWER climatology',
      temperature: normalizeNumber(current.temperature_2m),
      humidity: normalizeNumber(current.relative_humidity_2m),
      rainfall: normalizeNumber(current.precipitation) ?? annualRainfall,
      pressure: normalizeNumber(current.pressure_msl),
      windSpeed: normalizeNumber(current.wind_speed_10m),
      warmingIndex: estimateWarmingIndex(normalizeNumber(current.temperature_2m), history),
      history,
      raw: { forecast, climatology },
    }

    await persistClimate(climate)
    return climate
  } catch {
    const fallback = fallbackClimate(coordinates)
    await persistClimate(fallback)
    return fallback
  }
}

async function getPowerClimatology(coordinates: Coordinates) {
  const params = new URLSearchParams({
    parameters: 'T2M,RH2M,PRECTOTCORR',
    community: 'AG',
    longitude: String(coordinates.longitude),
    latitude: String(coordinates.latitude),
    format: 'JSON',
  })

  try {
    return await fetchJson<NasaPowerResponse>(
      `https://power.larc.nasa.gov/api/temporal/climatology/point?${params.toString()}`,
      { timeoutMs: 8000 },
    )
  } catch {
    return null
  }
}

function buildForecastHistory(forecast: OpenMeteoForecastResponse, climatology: NasaPowerResponse | null) {
  const power = climatology?.properties?.parameter

  if (power?.T2M && power.PRECTOTCORR) {
    return Object.keys(power.T2M)
      .filter((key) => key !== 'ANN')
      .slice(0, 12)
      .map<ClimateHistoryPoint>((label) => ({
        label,
        temperature: normalizeNumber(power.T2M?.[label]) ?? null,
        rainfall: normalizeNumber(power.PRECTOTCORR?.[label]) ?? null,
      }))
  }

  const times = forecast.daily?.time ?? []
  const rainfall = forecast.daily?.precipitation_sum ?? []
  const highs = forecast.daily?.temperature_2m_max ?? []
  const lows = forecast.daily?.temperature_2m_min ?? []

  return times.map<ClimateHistoryPoint>((time, index) => ({
    label: time.slice(5),
    temperature: normalizeNumber((highs[index] + lows[index]) / 2) ?? null,
    rainfall: normalizeNumber(rainfall[index]) ?? null,
  }))
}

function fallbackClimate(coordinates: Coordinates): ClimateResult {
  const tropical = Math.abs(coordinates.latitude) < 30
  const rainfall = tropical ? 118 : 72
  const temperature = tropical ? 30 : 22

  return {
    source: 'Rule-based climate fallback',
    temperature,
    humidity: tropical ? 64 : 48,
    rainfall,
    pressure: 1008,
    windSpeed: 9,
    warmingIndex: tropical ? 1.4 : 1.1,
    history: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((label, index) => ({
      label,
      temperature: temperature + Math.sin(index) * 3,
      rainfall: Math.max(12, rainfall + Math.cos(index) * 38),
    })),
  }
}

function estimateWarmingIndex(currentTemp: number | null, history: ClimateHistoryPoint[]) {
  const historicalTemps = history.map((point) => point.temperature).filter(isNumber)
  const baseline = average(historicalTemps)

  if (!isNumber(currentTemp) || !isNumber(baseline)) return 1.2

  return Math.max(0.4, Math.min(2.8, Math.round((currentTemp - baseline + 1.1) * 10) / 10))
}

function normalizeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null
}

function average(values: number[]) {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

async function persistClimate(climate: ClimateResult) {
  await safeDb(() =>
    prisma!.climateRecord.create({
      data: {
        source: climate.source,
        temperature: climate.temperature,
        humidity: climate.humidity,
        precipitation: climate.rainfall,
        pressure: climate.pressure,
        windSpeed: climate.windSpeed,
        rawPayload: climate.raw === undefined ? undefined : (climate.raw as object),
      },
    }),
  )
}
