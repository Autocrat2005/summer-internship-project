import type { Coordinates } from '../types/report.js'

const COORDINATE_PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/

export function parseCoordinates(value: string): Coordinates | null {
  const match = value.match(COORDINATE_PAIR)

  if (!match) return null

  const latitude = Number(match[1])
  const longitude = Number(match[2])

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null

  return { latitude, longitude }
}

export function roundCoordinate(value: number) {
  return Math.round(value * 10000) / 10000
}

export function bboxAroundPoint({ latitude, longitude }: Coordinates, degrees = 0.08) {
  return [
    roundCoordinate(longitude - degrees),
    roundCoordinate(latitude - degrees),
    roundCoordinate(longitude + degrees),
    roundCoordinate(latitude + degrees),
  ]
}

export function distanceKm(a: Coordinates, b: Coordinates) {
  const earthRadiusKm = 6371
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const deltaLat = toRadians(b.latitude - a.latitude)
  const deltaLon = toRadians(b.longitude - a.longitude)
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h))
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}
