import {
  AlertTriangle,
  BarChart3,
  CloudRain,
  Database,
  Globe2,
  Layers3,
  Loader2,
  MapPin,
  Radar,
  Satellite,
  Search,
  Sprout,
  ThermometerSun,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { getReport, type DashboardReport } from './api'

const pipeline = ['Location', 'Satellite', 'Classify', 'Climate', 'Farming', 'Disaster', 'Report']

function App() {
  const [query, setQuery] = useState('Kurukshetra')
  const [report, setReport] = useState<DashboardReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadReport(nextQuery: string) {
    setLoading(true)
    setError(null)

    try {
      setReport(await getReport(nextQuery))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReport('Kurukshetra')
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadReport(query)
  }

  const maxRainfall = useMemo(
    () => Math.max(1, ...(report?.climate.history.map((point) => point.rainfall ?? 0) ?? [1])),
    [report],
  )

  return (
    <main className="app-shell">
      <aside className="side-rail" aria-label="Global navigation">
        <div className="brand">
          <div className="brand-mark">
            <Globe2 size={22} aria-hidden="true" />
          </div>
          <div>
            <span>Global Type UI</span>
            <strong>TerraScope</strong>
          </div>
        </div>

        <nav className="rail-nav" aria-label="Dashboard sections">
          <a href="#overview" className="active">
            <BarChart3 size={18} aria-hidden="true" />
            Overview
          </a>
          <a href="#satellite">
            <Satellite size={18} aria-hidden="true" />
            Satellite
          </a>
          <a href="#farming">
            <Sprout size={18} aria-hidden="true" />
            Farming
          </a>
          <a href="#disasters">
            <AlertTriangle size={18} aria-hidden="true" />
            Risk
          </a>
        </nav>

        <div className="rail-card">
          <span>System status</span>
          <strong>{loading ? 'Processing AOI' : error ? 'Attention required' : 'Report online'}</strong>
          <p>{report?.cached ? 'Loaded from report cache.' : 'Live pipeline ready for no-key public datasets.'}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="hero-bar">
          <div>
            <p className="kicker">Geospatial Intelligence MVP</p>
            <h1>Earth observation analytics, reduced to its sharpest signal.</h1>
          </div>

          <form className="search-panel" onSubmit={handleSubmit}>
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Search location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Delhi, Kurukshetra, or 26.8, 83.4"
            />
            <button type="submit" disabled={loading}>
              {loading ? <Loader2 size={17} aria-hidden="true" /> : 'Analyze'}
            </button>
          </form>
        </header>

        <section className="pipeline" aria-label="Analysis pipeline">
          {pipeline.map((item, index) => (
            <div className="pipeline-item" key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </section>

        {error && (
          <section className="error-banner" role="alert">
            <AlertTriangle size={19} aria-hidden="true" />
            <div>
              <strong>Backend report failed</strong>
              <p>{error}. Start the backend with `npm --prefix backend run dev` and retry.</p>
            </div>
          </section>
        )}

        {loading && !report ? <SkeletonDashboard /> : report && <Dashboard report={report} maxRainfall={maxRainfall} />}
      </section>
    </main>
  )
}

function Dashboard({ report, maxRainfall }: { report: DashboardReport; maxRainfall: number }) {
  const topCrop = report.farming.recommendations[0]
  const topDisaster = report.disasters[0]

  return (
    <>
      {report.warnings.length > 0 && (
        <section className="warning-strip">
          {report.warnings.map((warning) => (
            <span key={`${warning.service}-${warning.message}`}>
              {warning.service}: {warning.message}
            </span>
          ))}
        </section>
      )}

      <section className="dashboard-grid" id="overview">
        <article className="map-panel" id="satellite">
          <div className="panel-head">
            <div>
              <p className="kicker">Selected AOI</p>
              <h2>{report.location.name}</h2>
            </div>
            <DataBadge label={`${report.classification.confidence}% confidence`} />
          </div>

          <div
            className="satellite-view"
            role="img"
            aria-label={`Satellite view for ${report.location.name}`}
            style={{ backgroundImage: `linear-gradient(rgba(10, 10, 10, .08), rgba(10, 10, 10, .55)), url("${report.satellite.gibs.previewUrl}")` }}
          >
            <div className="scan" />
            <div className="target-ring" />
            <div className="target-dot" />
            <span className="map-label">
              <MapPin size={15} aria-hidden="true" />
              {report.location.latitude.toFixed(3)}, {report.location.longitude.toFixed(3)}
            </span>
            <span className="source-pill">
              <Layers3 size={15} aria-hidden="true" />
              {report.satellite.gibs.layer}
            </span>
          </div>

          <div className="fact-grid">
            <Fact label="Land cover" value={report.classification.landCoverLabel} />
            <Fact label="Region" value={report.classification.regionType} />
            <Fact label="Settlement" value={report.classification.urbanRural} />
            <Fact label="Elevation" value={formatNullable(report.classification.elevationMeters, 'm')} />
          </div>
        </article>

        <aside className="signal-stack">
          <SignalCard icon={<ThermometerSun size={21} />} label="Temperature" value={formatNullable(report.climate.temperature, 'C')} />
          <SignalCard icon={<CloudRain size={21} />} label="Rainfall" value={formatNullable(report.climate.rainfall, 'mm')} />
          <SignalCard icon={<Radar size={21} />} label="NDVI proxy" value={report.classification.ndviProxy.toFixed(2)} />
        </aside>
      </section>

      <section className="analytics-grid">
        <article className="panel climate-panel">
          <div className="panel-head">
            <div>
              <p className="kicker">Climate</p>
              <h2>Weather and historical signal</h2>
            </div>
            <DataBadge label={report.climate.source} />
          </div>

          <div className="fact-grid compact">
            <Fact label="Humidity" value={formatNullable(report.climate.humidity, '%')} />
            <Fact label="Pressure" value={formatNullable(report.climate.pressure, 'hPa')} />
            <Fact label="Wind" value={formatNullable(report.climate.windSpeed, 'km/h')} />
            <Fact label="Warming" value={`+${report.climate.warmingIndex} C`} />
          </div>

          <div className="bar-chart" aria-label="Historical rainfall">
            {report.climate.history.slice(0, 12).map((point) => (
              <div className="bar-cell" key={point.label}>
                <div className="bar" style={{ height: `${((point.rainfall ?? 0) / maxRainfall) * 100}%` }} />
                <span>{point.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel crop-panel" id="farming">
          <div className="panel-head">
            <div>
              <p className="kicker">Farming</p>
              <h2>{report.farming.suitable ? 'Suitable' : 'Limited'} crop window</h2>
            </div>
            <DataBadge label={`${report.farming.score}/100`} />
          </div>

          <div className="crop-list">
            {report.farming.recommendations.map((crop) => (
              <div className="crop-card" key={crop.cropName}>
                <strong>{crop.cropName}</strong>
                <span>{crop.season}</span>
                <meter min="0" max="100" value={crop.score} />
              </div>
            ))}
          </div>
          <p className="body-copy">{topCrop?.reasons[0] ?? report.explanation.farming}</p>
        </article>

        <article className="panel disaster-panel" id="disasters">
          <div className="panel-head">
            <div>
              <p className="kicker">Risk</p>
              <h2>{topDisaster ? topDisaster.name : 'No nearby event'}</h2>
            </div>
            <DataBadge label={topDisaster?.severity ?? 'Low'} tone="red" />
          </div>

          <div className="timeline">
            {report.disasters.length ? (
              report.disasters.slice(0, 4).map((event) => (
                <div className="timeline-item" key={`${event.source}-${event.name}-${event.year ?? 'na'}`}>
                  <span>{event.year ?? 'Live'}</span>
                  <strong>{event.type}</strong>
                  <p>{event.reason}</p>
                </div>
              ))
            ) : (
              <p className="body-copy">No disaster signal found in the configured public and seeded datasets.</p>
            )}
          </div>
        </article>

        <article className="panel report-panel">
          <div className="panel-head">
            <div>
              <p className="kicker">Dashboard API</p>
              <h2>Unified report payload</h2>
            </div>
            <Database size={22} aria-hidden="true" />
          </div>

          <pre>{JSON.stringify(compactReport(report), null, 2)}</pre>
        </article>
      </section>
    </>
  )
}

function SkeletonDashboard() {
  return (
    <section className="skeleton-grid" aria-label="Loading dashboard">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="skeleton-card" key={index} />
      ))}
    </section>
  )
}

function SignalCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="signal-card">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function DataBadge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'red' }) {
  return <span className={`data-badge ${tone}`}>{label}</span>
}

function formatNullable(value: number | null, suffix: string) {
  return value === null ? 'n/a' : `${value} ${suffix}`
}

function compactReport(report: DashboardReport) {
  return {
    location: report.location.name,
    satelliteImage: report.satellite.gibs.previewUrl,
    category: report.classification.landCoverLabel,
    urbanRural: report.classification.urbanRural,
    temperature: report.climate.temperature,
    humidity: report.climate.humidity,
    rainfall: report.climate.rainfall,
    cropRecommendation: report.farming.recommendations.map((crop) => crop.cropName),
    disasterHistory: report.disasters.map((event) => event.name),
    warnings: report.warnings,
  }
}

export default App
