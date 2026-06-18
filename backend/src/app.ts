import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'
import { apiRouter } from './routes/api.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        callback(new Error(`CORS blocked origin: ${origin}`))
      },
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  app.get('/', (_req, res) => {
    res.json({
      name: 'Geospatial Intelligence API',
      version: '1.0.0',
      health: '/api/health',
      report: '/api/report?query=Kurukshetra',
    })
  })

  app.use('/api', apiRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
