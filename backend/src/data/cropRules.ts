export type CropRuleDefinition = {
  cropName: string
  season: string
  minTemperature: number
  maxTemperature: number
  minRainfall: number
  maxRainfall: number
  minHumidity?: number
  maxHumidity?: number
  preferredLand: string[]
  notes: string
}

export const cropRules: CropRuleDefinition[] = [
  {
    cropName: 'Rice',
    season: 'Kharif',
    minTemperature: 22,
    maxTemperature: 35,
    minRainfall: 100,
    maxRainfall: 240,
    minHumidity: 55,
    preferredLand: ['Cropland', 'Herbaceous wetland', 'Wet agricultural belt'],
    notes: 'Best where humidity and monsoon rainfall are high.',
  },
  {
    cropName: 'Wheat',
    season: 'Rabi',
    minTemperature: 12,
    maxTemperature: 28,
    minRainfall: 35,
    maxRainfall: 120,
    preferredLand: ['Cropland', 'Agricultural mosaic', 'Alluvial plain'],
    notes: 'Good winter crop in plains with moderate rainfall.',
  },
  {
    cropName: 'Maize',
    season: 'Kharif/Rabi',
    minTemperature: 18,
    maxTemperature: 32,
    minRainfall: 50,
    maxRainfall: 160,
    preferredLand: ['Cropland', 'Shrubland', 'Agricultural mosaic'],
    notes: 'Flexible crop for warm, moderately wet regions.',
  },
  {
    cropName: 'Mustard',
    season: 'Rabi',
    minTemperature: 10,
    maxTemperature: 28,
    minRainfall: 20,
    maxRainfall: 90,
    preferredLand: ['Cropland', 'Built-up', 'Alluvial plain'],
    notes: 'Works well in cooler dry-season conditions.',
  },
  {
    cropName: 'Sugarcane',
    season: 'Annual',
    minTemperature: 24,
    maxTemperature: 36,
    minRainfall: 120,
    maxRainfall: 260,
    minHumidity: 60,
    preferredLand: ['Cropland', 'Wet agricultural belt', 'Alluvial plain'],
    notes: 'High water-demand crop for warm humid belts.',
  },
  {
    cropName: 'Pulses',
    season: 'Rabi/Kharif',
    minTemperature: 18,
    maxTemperature: 32,
    minRainfall: 35,
    maxRainfall: 125,
    preferredLand: ['Cropland', 'Shrubland', 'Bare sparse vegetation'],
    notes: 'Lower water demand and useful where rainfall is moderate.',
  },
]
