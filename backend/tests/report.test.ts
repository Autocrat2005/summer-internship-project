import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'

const app = createApp()

describe('report API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the full report flow for a seeded location', async () => {
    stubSuccessfulFetch()

    const response = await request(app).get('/api/report?query=Kurukshetra').expect(200)

    expect(response.body.location.name).toBe('Kurukshetra')
    expect(response.body.satellite.scenes[0].provider).toBe('Earth Search STAC')
    expect(response.body.classification.landCoverLabel).toBeTruthy()
    expect(response.body.climate.temperature).toBe(31.2)
    expect(response.body.farming.recommendations.length).toBeGreaterThan(0)
    expect(response.body.disasters.length).toBeGreaterThan(0)
    expect(response.body.explanation.summary).toContain('Kurukshetra')
  })

  it('keeps the report usable when public data APIs fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network unavailable')
      }),
    )

    const response = await request(app).get('/api/report?query=26.8,83.4').expect(200)

    expect(response.body.location.name).toContain('AOI')
    expect(response.body.climate.source).toContain('fallback')
    expect(response.body.satellite.source).toContain('fallback')
    expect(response.body.warnings.length).toBeGreaterThan(0)
  })
})

function stubSuccessfulFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input)

      if (url.includes('/forecast?')) {
        return jsonResponse({
          current: {
            temperature_2m: 31.2,
            relative_humidity_2m: 64,
            precipitation: 2.5,
            pressure_msl: 1008,
            wind_speed_10m: 9.4,
          },
          daily: {
            time: ['2026-06-12', '2026-06-13'],
            precipitation_sum: [4, 8],
            temperature_2m_max: [34, 35],
            temperature_2m_min: [24, 25],
          },
        })
      }

      if (url.includes('power.larc.nasa.gov')) {
        return jsonResponse({
          properties: {
            parameter: {
              T2M: { JAN: 16, FEB: 18, MAR: 23, APR: 29, MAY: 33, JUN: 34 },
              RH2M: { JAN: 62, FEB: 58, MAR: 51, APR: 42, MAY: 38, JUN: 49 },
              PRECTOTCORR: { JAN: 24, FEB: 28, MAR: 31, APR: 22, MAY: 45, JUN: 94 },
            },
          },
        })
      }

      if (url.includes('/elevation?')) {
        return jsonResponse({ elevation: [258] })
      }

      if (url.includes('earth-search.aws.element84.com')) {
        return jsonResponse({
          features: [
            {
              id: 'S2_TEST_SCENE',
              collection: 'sentinel-2-l2a',
              properties: {
                datetime: '2026-06-01T05:00:00Z',
                'eo:cloud_cover': 12,
              },
              assets: {
                thumbnail: { href: 'https://example.com/sentinel.jpg' },
              },
            },
          ],
        })
      }

      if (url.includes('eonet.gsfc.nasa.gov')) {
        return jsonResponse({ events: [] })
      }

      if (url.includes('earthquake.usgs.gov')) {
        return jsonResponse({
          features: [
            {
              properties: {
                title: 'M 4.8 - regional earthquake',
                mag: 4.8,
                time: Date.UTC(2024, 3, 3),
                place: 'near northern India',
              },
              geometry: { coordinates: [76.9, 30.1, 10] },
            },
          ],
        })
      }

      return jsonResponse({})
    }),
  )
}

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
