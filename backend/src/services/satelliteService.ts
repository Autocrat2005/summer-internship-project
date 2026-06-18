import { prisma, safeDb } from '../db/prisma.js'
import type { Coordinates, SatelliteResult, SatelliteSceneResult } from '../types/report.js'
import { bboxAroundPoint, roundCoordinate } from '../utils/geo.js'
import { fetchJson } from '../utils/http.js'

type StacSearchResponse = {
  features?: {
    id: string
    collection?: string
    properties?: {
      datetime?: string
      'eo:cloud_cover'?: number
    }
    assets?: {
      thumbnail?: { href?: string }
      rendered_preview?: { href?: string }
    }
  }[]
}

export async function getSatellite(coordinates: Coordinates): Promise<SatelliteResult> {
  const gibs = buildGibsConfig(coordinates)
  const scenes = await getEarthSearchScenes(coordinates)

  await persistScenes(scenes)

  return {
    source:
      scenes[0]?.provider === 'NASA GIBS'
        ? 'NASA GIBS fallback (Earth Search unavailable)'
        : 'NASA GIBS + Earth Search STAC',
    gibs,
    scenes,
  }
}

function buildGibsConfig({ latitude, longitude }: Coordinates) {
  const layer = 'MODIS_Terra_CorrectedReflectance_TrueColor'
  const date = new Date().toISOString().slice(0, 10)
  const bbox = bboxAroundPoint({ latitude, longitude }, 0.18).join(',')

  return {
    service: 'NASA GIBS WMS',
    layer,
    projection: 'EPSG:4326',
    tileMatrixSet: '250m',
    tileTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/{date}/250m/{z}/{y}/{x}.jpg',
    previewUrl:
      `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0` +
      `&LAYERS=${layer}&CRS=EPSG:4326&FORMAT=image/jpeg&WIDTH=900&HEIGHT=520&TIME=${date}&BBOX=${bbox}`,
  }
}

async function getEarthSearchScenes(coordinates: Coordinates) {
  const body = {
    collections: ['sentinel-2-l2a', 'landsat-c2-l2'],
    bbox: bboxAroundPoint(coordinates, 0.12),
    limit: 5,
    query: {
      'eo:cloud_cover': {
        lt: 45,
      },
    },
    sortby: [{ field: 'properties.datetime', direction: 'desc' }],
  }

  try {
    const data = await fetchJson<StacSearchResponse>('https://earth-search.aws.element84.com/v1/search', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
      },
      timeoutMs: 9000,
    })

    return (data.features ?? []).map<SatelliteSceneResult>((feature) => ({
      provider: 'Earth Search STAC',
      collection: feature.collection ?? 'unknown',
      sceneId: feature.id,
      acquisitionDate: feature.properties?.datetime,
      cloudCover: feature.properties?.['eo:cloud_cover'],
      previewUrl: feature.assets?.thumbnail?.href ?? feature.assets?.rendered_preview?.href,
    }))
  } catch {
    return [
      {
        provider: 'NASA GIBS',
        collection: 'MODIS Terra Corrected Reflectance',
        sceneId: `gibs-${roundCoordinate(coordinates.latitude)}-${roundCoordinate(coordinates.longitude)}`,
        acquisitionDate: new Date().toISOString(),
        cloudCover: undefined,
        previewUrl: buildGibsConfig(coordinates).previewUrl,
      },
    ]
  }
}

async function persistScenes(scenes: SatelliteSceneResult[]) {
  await Promise.all(
    scenes.map((scene) =>
      safeDb(() =>
        prisma!.satelliteScene.create({
          data: {
            provider: scene.provider,
            collection: scene.collection,
            sceneId: scene.sceneId,
            acquisitionDate: scene.acquisitionDate ? new Date(scene.acquisitionDate) : undefined,
            cloudCover: scene.cloudCover,
            previewUrl: scene.previewUrl,
            rawPayload: scene as object,
          },
        }),
      ),
    ),
  )
}
