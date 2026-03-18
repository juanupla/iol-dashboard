const BASE = import.meta.env.VITE_API_URL || '/api'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  status: () => req('/status'),
  
  screener: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString()
    return req(`/screener${qs ? '?' + qs : ''}`)
  },

  oportunidades: () => req('/screener/oportunidades'),
  
  refreshScreener: () => req('/screener/refresh', { method: 'POST' }),

  portafolio: () => req('/portafolio'),
  
  estadoCuenta: () => req('/estado-cuenta'),

  alertas: () => req('/alertas'),
  
  crearAlerta: (data) => req('/alertas', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  eliminarAlerta: (id) => req(`/alertas/${id}`, { method: 'DELETE' }),
  
  evaluarAlertas: () => req('/alertas/evaluar', { method: 'POST' }),
}
