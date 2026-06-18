import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  CloudRain,
  Database,
  Droplets,
  Gauge,
  Leaf,
  Layers,
  LocateFixed,
  MapPinned,
  Microscope,
  Radar,
  Satellite,
  Search,
  ShieldAlert,
  Sprout,
  ThermometerSun,
  Waves,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'

type Report = {
  name: string
  coordinates: string
  regionType: string
  landType: string
  urbanRural: string
  confidence: number
  temperature: number
  humidity: number
  rainfall: number
  pressure: number
  warmingIndex: number
  ndvi: number
  crops: string[]
  suitability: string
  disaster: {
    name: string
    year: number
    severity: string
    reason: string
    explanation: string
  }
  history: { label: string; value: number }[]
}

const reports: Record<string, Report> = {
  delhi: {
    name: 'Delhi',
    coordinates: '28.61 N, 77.21 E',
    regionType: 'Indo-Gangetic plain',
    landType: 'Urban built-up',
    urbanRural: 'Urban',
    confidence: 91,
    temperature: 34,
    humidity: 58,
    rainfall: 74,
    pressure: 1006,
    warmingIndex: 1.8,
    ndvi: 0.31,
    crops: ['Mustard', 'Wheat', 'Vegetables'],
    suitability: 'Moderate',
    disaster: {
      name: 'Urban Flooding',
      year: 2023,
      severity: 'High',
      reason: 'Intense rainfall and low drainage capacity',
      explanation:
        'Flood risk is elevated where rapid runoff, paved surfaces, and short-duration heavy rainfall overlap.',
    },
    history: [
      { label: '2019', value: 29 },
      { label: '2020', value: 32 },
      { label: '2021', value: 35 },
      { label: '2022', value: 38 },
      { label: '2023', value: 43 },
    ],
  },
  kurukshetra: {
    name: 'Kurukshetra',
    coordinates: '29.96 N, 76.82 E',
    regionType: 'Alluvial plain',
    landType: 'Agricultural mosaic',
    urbanRural: 'Peri-urban',
    confidence: 88,
    temperature: 31,
    humidity: 63,
    rainfall: 112,
    pressure: 1009,
    warmingIndex: 1.2,
    ndvi: 0.64,
    crops: ['Rice', 'Wheat', 'Maize'],
    suitability: 'High',
    disaster: {
      name: 'Flood',
      year: 2020,
      severity: 'Medium',
      reason: 'Heavy monsoon rainfall and waterlogging',
      explanation:
        'Flooding occurred due to excess rainfall, saturated fields, and slower water evacuation in low-lying blocks.',
    },
    history: [
      { label: '2019', value: 96 },
      { label: '2020', value: 138 },
      { label: '2021', value: 104 },
      { label: '2022', value: 117 },
      { label: '2023', value: 126 },
    ],
  },
  coordinates: {
    name: 'Gorakhpur Basin',
    coordinates: '26.80 N, 83.40 E',
    regionType: 'Riverine plain',
    landType: 'Wet agricultural belt',
    urbanRural: 'Rural',
    confidence: 84,
    temperature: 30,
    humidity: 71,
    rainfall: 158,
    pressure: 1004,
    warmingIndex: 1.4,
    ndvi: 0.72,
    crops: ['Rice', 'Sugarcane', 'Pulses'],
    suitability: 'High',
    disaster: {
      name: 'Flood',
      year: 2021,
      severity: 'High',
      reason: 'River overflow after prolonged rainfall',
      explanation:
        'Flood exposure is high because rainfall accumulation and nearby river overflow can affect cropland at the same time.',
    },
    history: [
      { label: '2019', value: 121 },
      { label: '2020', value: 147 },
      { label: '2021', value: 181 },
      { label: '2022', value: 139 },
      { label: '2023', value: 166 },
    ],
  },
}

const pipeline = [
  { label: 'Location', icon: LocateFixed },
  { label: 'Satellite', icon: Satellite },
  { label: 'Classification', icon: Microscope },
  { label: 'Climate', icon: ThermometerSun },
  { label: 'Farming', icon: Sprout },
  { label: 'Disaster', icon: AlertTriangle },
  { label: 'Report API', icon: Database },
]

const API_ENDPOINTS = [
  'GET /locations',
  'GET /satellite/:location',
  'GET /dashboard/:location',
  'GET /farming/:location',
  'GET /disaster/:location',
  'GET /report/:location',
]

function findReport(input: string) {
  const normalized = input.trim().toLowerCase()

  if (normalized.includes('kurukshetra')) return reports.kurukshetra
  if (normalized.includes('delhi')) return reports.delhi
  if (normalized.includes('26.8') || normalized.includes('83.4')) return reports.coordinates

  return reports.kurukshetra
}

function App() {
  const [query, setQuery] = useState('Kurukshetra')
  const [report, setReport] = useState<Report>(reports.kurukshetra)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setReport(findReport(query))
  }

  const maxHistory = Math.max(...report.history.map((item) => item.value))
  const insightScore = Math.min(98, Math.round(report.confidence * 0.55 + report.ndvi * 62))
  const reportPayload = [
    ['location', report.name],
    ['satelliteImage', 'World Imagery tile'],
    ['category', report.landType],
    ['urbanRural', report.urbanRural],
    ['cropRecommendation', report.crops.join(', ')],
    ['disasterHistory', `${report.disaster.name} ${report.disaster.year}`],
  ]

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Platform navigation">
        <div className="sidebar-sheen" aria-hidden="true" />
        <div className="brand-block">
          <div className="brand-mark">
            <Satellite size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Earth Observation</p>
            <h1>TerraScope</h1>
          </div>
        </div>

        <nav className="nav-stack" aria-label="Dashboard sections">
          <a href="#overview" className="active">
            <BarChart3 size={18} aria-hidden="true" />
            Overview
          </a>
          <a href="#satellite">
            <MapPinned size={18} aria-hidden="true" />
            Satellite
          </a>
          <a href="#farming">
            <Leaf size={18} aria-hidden="true" />
            Farming
          </a>
          <a href="#disaster">
            <AlertTriangle size={18} aria-hidden="true" />
            Disaster
          </a>
        </nav>

        <section className="mission-card" aria-label="Prototype status">
          <div className="mission-card-top">
            <Radar size={20} aria-hidden="true" />
            <span>Prototype run</span>
          </div>
          <strong>MVP analytics cockpit</strong>
          <p>Frontend preview wired for the future unified report endpoint.</p>
        </section>

        <section className="endpoint-panel" aria-label="Backend contract preview">
          <p className="section-kicker">Dashboard API</p>
          <div className="endpoint-list">
            {API_ENDPOINTS.map((endpoint) => (
              <code key={endpoint}>{endpoint}</code>
            ))}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-block">
            <p className="eyebrow">MVP flow</p>
            <h2>Geospatial Intelligence Dashboard</h2>
            <p className="topbar-copy">
              Search any supported sample and inspect the same journey the backend will expose through
              <span> /report/:location</span>.
            </p>
          </div>
          <form className="search-box" onSubmit={handleSubmit}>
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Search location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Delhi, Kurukshetra, or 26.8, 83.4"
            />
            <button type="submit">Analyze</button>
          </form>
        </header>

        <section className="pipeline-strip" aria-label="Analysis pipeline">
          {pipeline.map((step, index) => {
            const Icon = step.icon

            return (
              <div className="pipeline-step" key={step.label}>
                <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
                <Icon size={17} aria-hidden="true" />
                <span>{step.label}</span>
                {index < pipeline.length - 1 && <ChevronRight size={14} aria-hidden="true" />}
              </div>
            )
          })}
        </section>

        <section className="hero-grid" id="overview">
          <article className="satellite-panel" id="satellite">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Selected location</p>
                <h3>{report.name}</h3>
              </div>
              <div className="status-cluster">
                <span className="live-dot" />
                <span className="status-pill">{report.confidence}% confidence</span>
              </div>
            </div>

            <div className="satellite-frame" role="img" aria-label={`Satellite view of ${report.name}`}>
              <div className="satellite-noise" aria-hidden="true" />
              <div className="scan-line" aria-hidden="true" />
              <div className="range-ring ring-one" aria-hidden="true" />
              <div className="range-ring ring-two" aria-hidden="true" />
              <div className="map-crosshair">
                <span className="pulse-dot" />
              </div>
              <div className="map-tag map-tag-top">
                <Layers size={15} aria-hidden="true" />
                Landsat / Sentinel preview
              </div>
              <div className="location-chip">
                <MapPinned size={16} aria-hidden="true" />
                {report.coordinates}
              </div>
              <div className="spectral-legend" aria-label="Spectral layer legend">
                <span className="legend-item vegetation">Vegetation</span>
                <span className="legend-item water">Water</span>
                <span className="legend-item builtup">Built-up</span>
              </div>
            </div>

            <div className="classification-grid">
              <Metric label="Region type" value={report.regionType} />
              <Metric label="Land category" value={report.landType} />
              <Metric label="Area type" value={report.urbanRural} />
            </div>

            <div className="signal-row" aria-label="Analysis quality indicators">
              <div>
                <span>Model readiness</span>
                <strong>{insightScore}%</strong>
              </div>
              <div>
                <span>Climate match</span>
                <strong>{report.suitability}</strong>
              </div>
              <div>
                <span>Risk layer</span>
                <strong>{report.disaster.severity}</strong>
              </div>
            </div>
          </article>

          <div className="metric-column">
            <article className="metric-card climate-card">
              <div className="metric-card-head">
                <div className="metric-icon">
                  <ThermometerSun size={20} aria-hidden="true" />
                </div>
                <span className="trend-chip warm">+{report.warmingIndex} C</span>
              </div>
              <p>Temperature</p>
              <strong>{report.temperature} C</strong>
              <span>OpenWeather sample</span>
            </article>

            <article className="metric-card rain-card">
              <div className="metric-card-head">
                <div className="metric-icon">
                  <CloudRain size={20} aria-hidden="true" />
                </div>
                <Droplets size={20} aria-hidden="true" />
              </div>
              <p>Rainfall</p>
              <strong>{report.rainfall} mm</strong>
              <span>Seasonal estimate</span>
            </article>

            <article className="metric-card ndvi-card">
              <div className="metric-card-head">
                <div className="metric-icon">
                  <Activity size={20} aria-hidden="true" />
                </div>
                <Gauge size={20} aria-hidden="true" />
              </div>
              <p>Vegetation index</p>
              <strong>{report.ndvi.toFixed(2)}</strong>
              <span>NDVI proxy</span>
            </article>
          </div>
        </section>

        <section className="insight-grid">
          <article className="data-panel climate-summary">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Climate dashboard</p>
                <h3>Weather and trend signals</h3>
              </div>
              <Waves size={22} aria-hidden="true" />
            </div>
            <div className="compact-metrics">
              <Metric label="Humidity" value={`${report.humidity}%`} />
              <Metric label="Pressure" value={`${report.pressure} hPa`} />
              <Metric label="Warming index" value={`+${report.warmingIndex} C`} />
            </div>
            <div className="history-chart" aria-label="Historical rainfall records">
              {report.history.map((item) => (
                <div className="bar-wrap" key={item.label}>
                  <div className="bar" style={{ height: `${(item.value / maxHistory) * 100}%` }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="data-panel crop-panel" id="farming">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Farming suitability</p>
                <h3>{report.suitability} suitability</h3>
              </div>
              <Sprout size={22} aria-hidden="true" />
            </div>
            <div className="crop-list">
              {report.crops.map((crop) => (
                <span key={crop}>{crop}</span>
              ))}
            </div>
            <p className="body-copy">
              Crop recommendations combine temperature, rainfall, and observed vegetation patterns into a simple MVP
              suitability score.
            </p>
          </article>

          <article className="data-panel disaster-panel" id="disaster">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Disaster history</p>
                <h3>
                  {report.disaster.name}, {report.disaster.year}
                </h3>
              </div>
              <span className="severity">
                <ShieldAlert size={15} aria-hidden="true" />
                {report.disaster.severity}
              </span>
            </div>
            <p className="reason">{report.disaster.reason}</p>
            <p className="body-copy">{report.disaster.explanation}</p>
          </article>

          <article className="data-panel report-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Unified dashboard API</p>
                <h3>Report preview</h3>
              </div>
              <Database size={22} aria-hidden="true" />
            </div>
            <div className="payload-list" aria-label="Report response preview">
              {reportPayload.map(([label, value]) => (
                <div className="payload-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
