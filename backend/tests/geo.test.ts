import { describe, expect, it } from 'vitest'
import { parseCoordinates } from '../src/utils/geo.js'

describe('parseCoordinates', () => {
  it('parses comma-separated latitude and longitude', () => {
    expect(parseCoordinates('26.8, 83.4')).toEqual({
      latitude: 26.8,
      longitude: 83.4,
    })
  })

  it('rejects coordinates outside valid ranges', () => {
    expect(parseCoordinates('120, 83.4')).toBeNull()
    expect(parseCoordinates('26.8, 220')).toBeNull()
  })

  it('rejects non-coordinate location names', () => {
    expect(parseCoordinates('Kurukshetra')).toBeNull()
  })
})
