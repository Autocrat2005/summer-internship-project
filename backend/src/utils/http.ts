export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly service: string,
  ) {
    super(message)
  }
}

export async function fetchJson<T>(url: string, options: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 9000, ...requestOptions } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'geospatial-intelligence-mvp/1.0',
        ...(requestOptions.headers ?? {}),
      },
    })

    if (!response.ok) {
      throw new UpstreamError(`HTTP ${response.status} from ${url}`, new URL(url).hostname)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof UpstreamError) throw error
    throw new UpstreamError(error instanceof Error ? error.message : 'Unknown upstream error', new URL(url).hostname)
  } finally {
    clearTimeout(timeout)
  }
}
