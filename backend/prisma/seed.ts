import { PrismaClient } from '@prisma/client'
import { cropRules } from '../src/data/cropRules.js'
import { seededDisasters } from '../src/data/disasters.js'

const prisma = new PrismaClient()

async function main() {
  await prisma.cropRule.deleteMany()
  await prisma.cropRule.createMany({
    data: cropRules,
  })

  await prisma.disasterEvent.deleteMany({
    where: { source: 'Seeded India MVP dataset' },
  })
  await prisma.disasterEvent.createMany({
    data: seededDisasters.map((event) => ({
      name: event.name,
      type: event.type,
      year: event.year,
      severity: event.severity,
      reason: event.reason,
      source: event.source,
      latitude: event.latitude,
      longitude: event.longitude,
      rawPayload: event,
    })),
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
