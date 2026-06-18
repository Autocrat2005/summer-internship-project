import { describe, expect, it } from 'vitest'
import type { ClassificationResult, ClimateResult } from '../src/types/report.js'
import { getFarmingSuitability } from '../src/services/farmingService.js'

describe('getFarmingSuitability', () => {
  it('ranks rice highly for warm wet cropland', async () => {
    const climate: ClimateResult = {
      source: 'test',
      temperature: 30,
      humidity: 72,
      rainfall: 160,
      pressure: 1008,
      windSpeed: 7,
      warmingIndex: 1.3,
      history: [],
    }
    const classification: ClassificationResult = {
      source: 'test',
      landCoverCode: 40,
      landCoverLabel: 'Cropland',
      regionType: 'Riverine plain',
      urbanRural: 'Rural',
      elevationMeters: 84,
      confidence: 90,
      ndviProxy: 0.72,
      explanation: 'test',
    }

    const result = await getFarmingSuitability(climate, classification)

    expect(result.suitable).toBe(true)
    expect(result.recommendations[0]?.cropName).toBe('Rice')
    expect(result.recommendations[0]?.score).toBeGreaterThanOrEqual(80)
  })
})
