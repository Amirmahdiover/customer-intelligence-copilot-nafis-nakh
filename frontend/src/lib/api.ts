const API_BASE =
  import.meta.env.VITE_API_URL ||
  'https://customer-intelligence-copilot-nafis-nakh.onrender.com'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  // Supplying the page origin makes a relative development URL such as
  // `/api` work through Vite's proxy, while absolute production URLs keep
  // their existing behavior.
  const url = new URL(`${API_BASE}${path}`, window.location.origin)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    let message = `HTTP ${response.status}`

    try {
      const body = (await response.json()) as { detail?: string }

      if (body.detail) {
        message = body.detail
      }
    } catch {
      // ignore parse errors
    }

    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) message = payload.detail
    } catch {
      // Keep the HTTP status when the server response is not JSON.
    }
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<T>
}
