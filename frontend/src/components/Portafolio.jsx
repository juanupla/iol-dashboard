import { useState, useEffect } from 'react'
import { api } from '../api'

function Pct({ v }) {
  if (v == null) return <span style={{ color: 'var(--text3)' }}>—</span>
  const c = v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text3)'
  return <span style={{ fontFamily: 'var(--mono)', color: c }}>{v > 0 ? '+' : ''}{v.toFixed(2)}%</span>
}

function Money({ v }) {
  if (v == null) return <span style={{ color: 'var(--text3)' }}>—</span>
  const c = v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text2)'
  return <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: c }}>{v > 0 ? '+' : ''}${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
}

const SIGNAL_COLOR = {
  'COMPRA FUERTE': '#00e676', 'COMPRA': '#00c853', 'ALCISTA': '#82b1ff',
  'NEUTRO': '#55556a', 'BAJISTA': '#ffcc02', 'VENTA': '#ff5252', 'VENTA FUERTE': '#ff1744',
}

export default function Portafolio() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.portafolio()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div style={s.loading}>Cargando portafolio...</div>
  if (error) return <div style={s.error}>Error: {error}</div>

  const activos = data?.data?.activos || []
  const totalValorizado = activos.reduce((a, x) => a + (x.valorizado || 0), 0)
  const totalGanancia = activos.reduce((a, x) => a + (x.gananciaDinero || 0), 0)

  return (
    <div style={s.root}>
      {/* Summary */}
      <div style={s.summary}>
        <SummaryCard label="Posiciones" value={activos.length} />
        <SummaryCard
          label="Valorizado total"
          value={`$${totalValorizado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          accent
        />
        <SummaryCard
          label="Ganancia / Pérdida"
          value={`${totalGanancia >= 0 ? '+' : ''}$${totalGanancia.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          color={totalGanancia >= 0 ? 'var(--green)' : 'var(--red)'}
        />
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Símbolo','Tipo','Cantidad','PPC','Último Precio','Valorizado','G/P $','G/P %','Var. Diaria','Señal IOL','Razones'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activos.map(pos => {
              const ticker = pos.titulo?.simbolo
              const sc = pos.screener
              return (
                <tr key={ticker} style={s.tr}>
                  <td style={s.tdTicker}>{ticker}</td>
                  <td style={{ ...s.td, color: 'var(--text3)', fontSize: 11 }}>{pos.titulo?.tipo}</td>
                  <td style={s.tdMono}>{pos.cantidad?.toLocaleString('es-AR')}</td>
                  <td style={s.tdMono}>${pos.ppc?.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                  <td style={s.tdMono}>${pos.ultimoPrecio?.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                  <td style={s.tdMono}>${pos.valorizado?.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={s.td}><Money v={pos.gananciaDinero} /></td>
                  <td style={s.td}><Pct v={pos.gananciaPorcentaje} /></td>
                  <td style={s.td}><Pct v={pos.variacionDiaria} /></td>
                  <td style={s.td}>
                    {sc?.signal
                      ? <span style={{ color: SIGNAL_COLOR[sc.signal] || 'var(--text3)', fontWeight: 700, fontSize: 11 }}>{sc.signal}</span>
                      : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {(sc?.reasons || []).slice(0, 2).map((r, i) => (
                        <span key={i} style={s.chip}>{r}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {activos.length === 0 && (
          <p style={s.empty}>No hay posiciones en el portafolio.</p>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, accent, color }) {
  return (
    <div style={{ ...s.card, borderColor: accent ? 'var(--accent)' : 'var(--border)' }}>
      <p style={s.cardLabel}>{label}</p>
      <p style={{ ...s.cardValue, color: color || (accent ? 'var(--accent2)' : 'var(--text)') }}>{value}</p>
    </div>
  )
}

const s = {
  root: { display: 'flex', flexDirection: 'column', gap: 16 },
  summary: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  card: { flex: 1, minWidth: 180, padding: '14px 18px', background: 'var(--bg1)', border: '1px solid', borderRadius: 10 },
  cardLabel: { color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 6px' },
  cardValue: { fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, margin: 0 },
  tableWrap: { overflowX: 'auto', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '9px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, background: 'var(--bg)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '8px 12px', color: 'var(--text2)' },
  tdTicker: { padding: '8px 12px', color: 'var(--text)', fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: 1 },
  tdMono: { padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' },
  chip: { background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: 4, fontSize: 10 },
  empty: { padding: '32px', color: 'var(--text3)', textAlign: 'center', fontSize: 13 },
  loading: { padding: 60, textAlign: 'center', color: 'var(--text3)' },
  error: { padding: 40, color: 'var(--red)', background: 'var(--bg1)', borderRadius: 10, border: '1px solid var(--red)' },
}
