export type Coordinates = {
  latitude: number
  longitude: number
}

export type LocationResult = Coordinates & {
  name: string
  country?: string
  adminRegion?: string
  source: 'coordinates' | 'open-meteo' | 'seed' | 'user'
  raw?: unknown
}

export type SatelliteSceneResult = {
  provider: string
  collection: string
  sceneId?: string
  acquisitionDate?: string
  cloudCover?: number
  previewUrl?: string
}

export type SatelliteResult = {
  source: string
  gibs: {
    service: string
    layer: string
    projection: string
    tileMatrixSet: string
    tileTemplate: string
    previewUrl: string
  }
  scenes: SatelliteSceneResult[]
}

export type ClimateHistoryPoint = {
  label: string
  temperature: number | null
  rainfall: number | null
}

export type ClimateResult = {
  source: string
  temperature: number | null
  humidity: number | null
  rainfall: number | null
  pressure: number | null
  windSpeed: number | null
  warmingIndex: number
  history: ClimateHistoryPoint[]
  raw?: unknown
}

export type ClassificationResult = {
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

export type CropRecommendationResult = {
  cropName: string
  season: string
  score: number
  suitable: boolean
  reasons: string[]
}

export type FarmingResult = {
  source: string
  suitable: boolean
  score: number
  recommendations: CropRecommendationResult[]
  reasons: string[]
}

export type DisasterResult = {
  name: string
  type: string
  year?: number
  severity: 'Low' | 'Medium' | 'High'
  reason: string
  source: string
  latitude?: number
  longitude?: number
}

export type ReportWarnings = {
  service: string
  message: string
}[]

export type DashboardReport = {
  generatedAt: string
  query: string
  location: LocationResult
  satellite: SatelliteResult
  classification: ClassificationResult
  climate: ClimateResult
  farming: FarmingResult
  disasters: DisasterResult[]
  explanation: {
    summary: string
    farming: string
    disaster: string
  }
  warnings: ReportWarnings
  cached: boolean
}
