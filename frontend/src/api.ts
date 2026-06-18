export type LocationResult = {
  name: string
  latitude: number
  longitude: number
  country?: string
  adminRegion?: string
  source: string
}

export type SatelliteScene = {
  provider: string
  collection: string
  sceneId?: string
  acquisitionDate?: string
  cloudCover?: number
  previewUrl?: string
}

export type DashboardReport = {
  generatedAt: string
  query: string
  location: LocationResult
  satellite: {
    source: string
    gibs: {
      service: string
      layer: string
      projection: string
      tileMatrixSet: string
      tileTemplate: string
      previewUrl: string
    }
    scenes: SatelliteScene[]
  }
  classification: {
    source: string
    landCoverCode: number
    landCoverLabel: string
    regionType: string
    urbanRural: string
    elevationMeters: number | null
    confidence: number
    ndviProxy: number
    explanation: string
  }
  climate: {
    source: string
    temperature: number | null
    humidity: number | null
    rainfall: number | null
    pressure: number | null
    windSpeed: number | null
    warmingIndex: number
    history: { label: string; temperature: number | null; rainfall: number | null }[]
  }
  farming: {
    source: string
    suitable: boolean
    score: number
    recommendations: {
      cropName: string
      season: string
      score: number
      suitable: boolean
      reasons: string[]
    }[]
    reasons: string[]
  }
  disasters: {
    name: string
    type: string
    year?: number
    severity: 'Low' | 'Medium' | 'High'
    reason: string
    source: string
    latitude?: number
    longitude?: number
  }[]
  explanation: {
    summary: string
    farming: string
    disaster: string
  }
  warnings: { service: string; message: string }[]
  cached: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:4000/api'

export async function getReport(query: string) {
  return request<DashboardReport>(`/report?query=${encodeURIComponent(query)}`)
}

export async function getGeocode(query: string) {
  return request<LocationResult>(`/geocode?query=${encodeURIComponent(query)}`)
}

export async function getClimate(latitude: number, longitude: number) {
  return request<DashboardReport['climate']>(`/climate?lat=${latitude}&lon=${longitude}`)
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error ?? `Request failed with HTTP ${response.status}`)
  }

  return (await response.json()) as T
}
