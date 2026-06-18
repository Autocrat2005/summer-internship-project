# Geospatial Intelligence & Earth Observation Analytics MVP

A full-stack MVP for searching a location, collecting satellite and climate signals, classifying land characteristics, estimating farming suitability, checking disaster history, and returning one unified dashboard report.

## Structure

```text
frontend/  React + Vite + TypeScript dashboard
backend/   Node.js + Express + Prisma API
```

## Local Setup

Install dependencies:

```bash
npm run install:all
```

Run the backend:

```bash
cd backend
copy .env.example .env
npm run dev
```

Run the frontend in another terminal:

```bash
cd frontend
copy .env.example .env
npm run dev
```

Open `http://127.0.0.1:5173`.

The backend can run without PostgreSQL for demos. If `DATABASE_URL` is configured, Prisma stores locations, climate records, satellite scene metadata, classifications, recommendations, disaster events, and report cache rows.

## Main API

```text
GET /api/health
GET /api/geocode?query=Delhi
GET /api/locations
POST /api/locations
GET /api/satellite?lat=29.96&lon=76.82
GET /api/climate?lat=29.96&lon=76.82
GET /api/classification?lat=29.96&lon=76.82
GET /api/farming?lat=29.96&lon=76.82
GET /api/disasters?lat=29.96&lon=76.82
GET /api/report?query=Kurukshetra
```

## Free Data Sources

- Open-Meteo Geocoding, Forecast, Historical, and Elevation APIs
- NASA POWER climatology API
- NASA GIBS satellite imagery
- Earth Search STAC for Sentinel/Landsat scene metadata
- ESA WorldCover-inspired land-cover labels and fallback classification
- NASA EONET, GDACS, and USGS earthquake APIs

## Verification

```bash
npm --prefix backend run test
npm --prefix backend run build
npm --prefix frontend run build
npm run build
```
