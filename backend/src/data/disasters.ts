import type { DisasterResult } from '../types/report.js'

export const seededDisasters: DisasterResult[] = [
  {
    name: 'Urban Flooding',
    type: 'Flood',
    year: 2023,
    severity: 'High',
    reason: 'Intense rainfall, high impervious surface cover, and low drainage capacity.',
    source: 'Seeded India MVP dataset',
    latitude: 28.61,
    longitude: 77.21,
  },
  {
    name: 'Monsoon Flood',
    type: 'Flood',
    year: 2020,
    severity: 'Medium',
    reason: 'Heavy monsoon rainfall and waterlogging across agricultural blocks.',
    source: 'Seeded India MVP dataset',
    latitude: 29.96,
    longitude: 76.82,
  },
  {
    name: 'River Overflow Flood',
    type: 'Flood',
    year: 2021,
    severity: 'High',
    reason: 'River overflow after prolonged rainfall in the basin.',
    source: 'Seeded India MVP dataset',
    latitude: 26.8,
    longitude: 83.4,
  },
  {
    name: 'Drought Stress',
    type: 'Drought',
    year: 2019,
    severity: 'Medium',
    reason: 'Rainfall deficit and extended dry spells affected crop water availability.',
    source: 'Seeded India MVP dataset',
    latitude: 27.02,
    longitude: 75.82,
  },
]
