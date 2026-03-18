import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const GROUPS = [
  { id: '',        label: 'Todos' },
  { id: 'merval',  label: 'Merval' },
  { id: 'panel',   label: 'Panel Gral.' },
  { id: 'cedears', label: 'CEDEARs' },
]
const SIGNALS = [
  '', 'COMPRA FUERTE', 'COMPRA', 'ALCISTA', 'NEUTRO', 'BAJISTA', 'VENTA', 'VENTA FUERTE'
]
const SIGNAL_COLOR = {
  'COMPRA FUERTE': '#00e676', 'COMPRA': '#00c853', 'ALCISTA': '#82b1ff',
  'NEUTRO': '#55556a', 'BAJISTA': '#ffcc02', 'VENTA': '#ff5252', 'VENTA FUERTE': '#ff1744',
}
const SORT_OPTS = [
  { value: 'score',        label: 'Score' },
  { value: 'rsi',          label: 'RSI' },
  { value: 'var_dia',      label: 'Variación Día' },
  { value: 'vol_ratio',    label: 'Volumen Ratio' },
  { value: 'dist_min_52w', label: 'Dist. Mín 52w' },
]

// Colores y estilos por tipo de razón
const REASON_STYLE = {
  positivo:      { bg: '#00200f', border: '#00c853', color: '#00e676', icon: '▲' },
  leve_positivo: { bg: '#0d1a10', border: '#2e7d32', color: '#66bb6a', icon: '↑' },
  negativo:      { bg: '#1a0005', border: '#c62828', color: '#ef5350', icon: '▼' },
  alerta:        { bg: '#1a1000', border: '#e65100', color: '#ff9100', icon: '⚡' },
}

function ReasonTags({ reasons }) {
  if (!reasons || reasons.length === 0) return null

  // Soporta tanto el formato nuevo {texto, tipo} como el viejo string
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {reasons.map((r, i) => {
        const isObj = typeof r === 'object'
        const texto = isObj ? r.texto : r
        const tipo  = isObj ? r.tipo  : 'leve_positivo'
        const st    = REASON_STYLE[tipo] || REASON_STYLE.leve_positivo
        return (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: st.bg,
            border: `1px solid ${st.border}`,
            color: st.color,
            padding: '2px 7px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 0.3,
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 9, opacity: 0.8 }}>{st.icon}</span>
            {texto}
          </span>
        )
      })}
    </div>
  )
}

function Pct({ v }) {
  if (v == null) return <span style={{ color: 'var(--text3)' }}>—</span>
  const c = v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text3)'
  return <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: c }}>{v > 0 ? '+' : ''}{v.toFixed(2)}%</span>
}

function Mono({ v, decimals = 2, prefix = '' }) {
  if (v == null) return <span style={{ color: 'var(--text3)' }}>—</span>
  return <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{prefix}{typeof v === 'number' ? v.toLocaleString('es-AR', { maximumFractionDigits: decimals }) : v}</span>
}

function RsiCell({ v }) {
  if (v == null) return <span style={{ color: 'var(--text3)' }}>—</span>
  const color = v <= 30 ? 'var(--green)' : v >= 70 ? 'var(--red)' : 'var(--text2)'
  const bg    = v <= 30 ? '#002916'      : v >= 70 ? '#200005'    : 'transparent'
  return (
    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color, background: bg, padding: '2px 7px', borderRadius: 4 }}>
      {v}
    </span>
  )
}

export default function Screener() {
  const [results,  setResults]  = useState([])
  const [count,    setCount]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [filters,  setFilters]  = useState({ grupo: '', signal: '', sort_by: 'score', order: 'desc' })
  const [search,   setSearch]   = useState('')
  const [lastRun,  setLastRun]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.screener(filters)
      setResults(d.data || [])
      setCount(d.count || 0)
      setLastRun(d.last_run)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const filtered = search
    ? results.filter(r => r.ticker.toLowerCase().includes(search.toLowerCase()))
    : results

  return (
    <div style={s.root}>
      {/* Controls */}
      <div style={s.controls}>
        <input
          placeholder="Buscar ticker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={s.searchInput}
        />
        <div style={s.filterGroup}>
          {GROUPS.map(g => (
            <button key={g.id} onClick={() => setF('grupo', g.id)}
              style={filters.grupo === g.id ? s.btnActive : s.btn}>
              {g.label}
            </button>
          ))}
        </div>
        <select value={filters.signal} onChange={e => setF('signal', e.target.value)} style={s.select}>
          <option value="">Todas las señales</option>
          {SIGNALS.filter(Boolean).map(sig => (
            <option key={sig} value={sig}>{sig}</option>
          ))}
        </select>
        <select value={filters.sort_by} onChange={e => setF('sort_by', e.target.value)} style={s.select}>
          {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => setF('order', filters.order === 'desc' ? 'asc' : 'desc')} style={s.btn}>
          {filters.order === 'desc' ? '↓' : '↑'}
        </button>
        <span style={s.countBadge}>{filtered.length} activos</span>
      </div>

      {loading ? (
        <div style={s.loadingState}>
          <div style={s.spinner} />
          <span style={{ color: 'var(--text3)', fontSize: 13, marginTop: 12 }}>Cargando datos...</span>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Ticker','Grupo','Precio','Var%','RSI 14','SMA 20','SMA 50','SMA 200','Vol Ratio','Dist Mín 52w','Dist Máx 52w','Score','Señal','Análisis'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.ticker} style={s.tr}>
                  <td style={s.tdTicker}>{r.ticker}</td>
                  <td style={{ ...s.td, color: 'var(--text3)', fontSize: 11 }}>{r.grupo}</td>
                  <td><Mono v={r.price} prefix="$" /></td>
                  <td><Pct v={r.var_dia} /></td>
                  <td style={s.td}><RsiCell v={r.rsi} /></td>
                  <td><Mono v={r.sma20} prefix="$" /></td>
                  <td><Mono v={r.sma50} prefix="$" /></td>
                  <td><Mono v={r.sma200} prefix="$" /></td>
                  <td>
                    {r.vol_ratio != null
                      ? <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: r.vol_ratio >= 2 ? 'var(--orange)' : 'var(--text2)' }}>{r.vol_ratio.toFixed(1)}x</span>
                      : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td>
                    {r.dist_min_52w != null
                      ? <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: r.dist_min_52w <= 5 ? 'var(--yellow)' : 'var(--text2)' }}>+{r.dist_min_52w.toFixed(1)}%</span>
                      : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td><Pct v={r.dist_max_52w} /></td>
                  <td style={s.td}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: (r.score||0) > 0 ? 'var(--green)' : (r.score||0) < 0 ? 'var(--red)' : 'var(--text3)' }}>
                      {(r.score||0) > 0 ? '+' : ''}{r.score || 0}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      color: SIGNAL_COLOR[r.signal] || 'var(--text3)',
                      fontWeight: 700, fontSize: 11, letterSpacing: 1
                    }}>{r.signal || '—'}</span>
                  </td>
                  <td style={{ ...s.td, minWidth: 200 }}>
                    <ReasonTags reasons={r.reasons} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={s.empty}>No hay resultados para los filtros seleccionados.</p>
          )}
        </div>
      )}

      {lastRun && (
        <p style={s.footer}>
          Último scan: {new Date(lastRun).toLocaleString('es-AR')} · {count} tickers procesados
        </p>
      )}
    </div>
  )
}

const s = {
  root: { display: 'flex', flexDirection: 'column', gap: 12 },
  controls: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '12px 16px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10 },
  searchInput: { background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '6px 12px', borderRadius: 6, fontSize: 13, width: 160, outline: 'none' },
  filterGroup: { display: 'flex', gap: 2 },
  btn: { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)', padding: '5px 12px', borderRadius: 6, fontSize: 12 },
  btnActive: { background: 'var(--bg3)', border: '1px solid var(--accent)', color: 'var(--accent2)', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 },
  select: { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)', padding: '5px 10px', borderRadius: 6, fontSize: 12 },
  countBadge: { marginLeft: 'auto', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 },
  tableWrap: { overflowX: 'auto', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '9px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, background: 'var(--bg)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '8px 12px', color: 'var(--text2)' },
  tdTicker: { padding: '8px 12px', color: 'var(--text)', fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: 1 },
  empty: { padding: '32px', color: 'var(--text3)', textAlign: 'center', fontSize: 13 },
  footer: { color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--mono)', textAlign: 'right' },
  loadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' },
  spinner: { width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
}
