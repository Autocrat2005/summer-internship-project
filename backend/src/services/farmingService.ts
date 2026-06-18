import { cropRules } from '../data/cropRules.js'
import { prisma, safeDb } from '../db/prisma.js'
import type {
  ClassificationResult,
  ClimateResult,
  CropRecommendationResult,
  FarmingResult,
} from '../types/report.js'

export async function getFarmingSuitability(
  climate: ClimateResult,
  classification: ClassificationResult,
): Promise<FarmingResult> {
  const temperature = climate.temperature ?? 26
  const rainfall = climate.rainfall ?? 90
  const humidity = climate.humidity ?? 55

  const recommendations = cropRules
    .map<CropRecommendationResult>((rule) => {
      const reasons: string[] = []
      let score = 35

      score += rangeScore(temperature, rule.minTemperature, rule.maxTemperature, 30)
      score += rangeScore(rainfall, rule.minRainfall, rule.maxRainfall, 30)

      if (rule.minHumidity !== undefined || rule.maxHumidity !== undefined) {
        score += rangeScore(humidity, rule.minHumidity ?? 0, rule.maxHumidity ?? 100, 15)
      } else {
        score += 10
      }

      if (matchesLand(rule.preferredLand, classification)) {
        score += 18
        reasons.push(`Land signal matches ${classification.landCoverLabel.toLowerCase()}.`)
      }

      if (temperature >= rule.minTemperature && temperature <= rule.maxTemperature) {
        reasons.push(`Temperature ${temperature} C is inside the crop range.`)
      }

      if (rainfall >= rule.minRainfall && rainfall <= rule.maxRainfall) {
        reasons.push(`Rainfall ${rainfall} mm fits expected water demand.`)
      }

      return {
        cropName: rule.cropName,
        season: rule.season,
        score: Math.max(0, Math.min(100, Math.round(score))),
        suitable: score >= 70,
        reasons: reasons.length ? reasons : [rule.notes],
      }
    })
    .sort((a, b) => b.score - a.score)

  const top = recommendations.slice(0, 4)
  const score = top[0]?.score ?? 0
  const result: FarmingResult = {
    source: 'Rule-based crop suitability engine',
    suitable: score >= 70,
    score,
    recommendations: top,
    reasons: [
      `Top crop score is ${score}/100 based on temperature, rainfall, humidity, and land-cover match.`,
      `${classification.urbanRural} context affects crop confidence and irrigation assumptions.`,
    ],
  }

  await persistRecommendations(top)
  return result
}

function rangeScore(value: number, min: number, max: number, weight: number) {
  if (value >= min && value <= max) return weight
  const distance = value < min ? min - value : value - max
  const tolerance = Math.max(8, (max - min) * 0.7)
  return Math.max(0, weight * (1 - distance / tolerance))
}

function matchesLand(preferredLand: string[], classification: ClassificationResult) {
  const haystack = `${classification.landCoverLabel} ${classification.regionType}`.toLowerCase()
  return preferredLand.some((land) => haystack.includes(land.toLowerCase()))
}

async function persistRecommendations(recommendations: CropRecommendationResult[]) {
  await Promise.all(
    recommendations.map((recommendation) =>
      safeDb(() =>
        prisma!.cropRecommendation.create({
          data: {
            cropName: recommendation.cropName,
            score: recommendation.score,
            suitable: recommendation.suitable,
            reasons: recommendation.reasons,
            rawPayload: recommendation as object,
          },
        }),
      ),
    ),
  )
}
