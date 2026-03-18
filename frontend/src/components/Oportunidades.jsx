import { useState, useEffect } from 'react'
import { api } from '../api'

const SIGNAL_STYLE = {
  'COMPRA FUERTE': { bg: '#002916', border: '#00e676', color: '#00e676' },
  'COMPRA':        { bg: '#001a0f', border: '#00c853', color: '#00c853' },
  'ALCISTA':       { bg: '#0d1a2e', border: '#448aff', color: '#82b1ff' },
  'NEUTRO':        { bg: '#111128', border: '#2a2a50', color: '#666688' },
  'BAJISTA':       { bg: '#1a1000', border: '#ff9100', color: '#ffcc02' },
  'VENTA':         { bg: '#1a0008', border: '#d50000', color: '#ff5252' },
  'VENTA FUERTE':  { bg: '#200005', border: '#ff1744', color: '#ff1744' },
}

function SignalChip({ signal }) {
  const st = SIGNAL_STYLE[signal] || SIGNAL_STYLE['NEUTRO']
  return (
    <span style={{
      background: st.bg, border: `1px solid ${st.border}`, color: st.color,
      padding: '2px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700,
      letterSpacing: 1.2, whiteSpace: 'nowrap',
    }}>
      {signal}
    </span>
  )
}

function ScoreBar({ score }) {
  const clamped = Math.max(-5, Math.min(5, score || 0))
  const pct = ((clamped + 5) / 10) * 100
  const color = score >= 2 ? 'var(--green)' : score <= -2 ? 'var(--red)' : 'var(--yellow)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 4, background: 'var(--bg)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color }}>{score > 0 ? '+' : ''}{score}</span>
    </div>
  )
}

function Pct({ value }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text3)' }}>—</span>
  const cl = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  return <span className={cl}>{value > 0 ? '+' : ''}{value.toFixed(2)}%</span>
}

function CardSection({ title, color, items, renderRow, emptyMsg }) {
  return (
    <div style={s.card}>
      <div style={{ ...s.cardHeader, borderColor: color }}>
        <span style={{ color }}>{title}</span>
        <span style={s.count}>{items.length}</span>
      </div>
      {items.length === 0
        ? <p style={s.empty}>{emptyMsg}</p>
        : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Ticker</th>
                  <th style={s.th}>Precio</th>
                  <th style={s.th}>Var%</th>
                  <th style={s.th}>RSI</th>
                  <th style={s.th}>Score</th>
                  <th style={s.th}>Señal</th>
                  {renderRow.extraHeaders?.map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.ticker} style={s.tr}>
                    <td style={s.tdTicker}>{item.ticker}</td>
                    <td style={s.tdMono}>${(item.price || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                    <td style={s.td}><Pct value={item.var_dia} /></td>
                    <td style={s.td}><RsiCell value={item.rsi} /></td>
                    <td style={s.td}><ScoreBar score={item.score} /></td>
                    <td style={s.td}><SignalChip signal={item.signal} /></td>
                    {renderRow.extra?.(item)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

function RsiCell({ value }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text3)' }}>—</span>
  const color = value < 30 ? 'var(--green)' : value > 70 ? 'var(--red)' : 'var(--text2)'
  return <span style={{ fontFamily: 'var(--mono)', color, fontSize: 12 }}>{value}</span>
}

export default function Oportunidades() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.oportunidades()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton />

  if (!data || (!data.top_compras?.length && !data.top_ventas?.length && !data.cerca_minimo_52w?.length && !data.volumen_anomalo?.length)) {
    return (
      <div style={s.emptyState}>
        <div style={{ fontSize: 48 }}>🎯</div>
        <h2 style={{ color: 'var(--text2)', marginTop: 12 }}>Sin oportunidades todavía</h2>
        <p style={{ color: 'var(--text3)', marginTop: 6, fontSize: 13 }}>
          El screener se ejecuta automáticamente entre las 11:00 y las 17:00 (Buenos Aires).<br/>
          También podés ejecutarlo manualmente con el botón ↻ en la barra superior.
        </p>
      </div>
    )
  }

  return (
    <div style={s.root}>
      <div style={s.pageTitle}>
        <h1 style={s.title}>Panel de Oportunidades</h1>
        {data.last_run && (
          <span style={s.subtitle}>
            Última actualización: {new Date(data.last_run).toLocaleString('es-AR')}
          </span>
        )}
      </div>

      <div style={s.grid}>
        <CardSection
          title="🟢 Top Compras"
          color="var(--green)"
          items={data.top_compras || []}
          renderRow={{}}
          emptyMsg="No hay señales de compra actualmente"
        />
        <CardSection
          title="🔴 Top Ventas / Tomar Ganancia"
          color="var(--red)"
          items={data.top_ventas || []}
          renderRow={{}}
          emptyMsg="No hay señales de venta actualmente"
        />
        <CardSection
          title="📍 Cerca del Mínimo 52 Semanas"
          color="var(--yellow)"
          items={data.cerca_minimo_52w || []}
          renderRow={{
            extraHeaders: ['Dist. Mín 52w'],
            extra: (item) => (
              <td style={s.td}>
                <span style={{ color: 'var(--yellow)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  +{item.dist_min_52w?.toFixed(1)}%
                </span>
              </td>
            ),
          }}
          emptyMsg="Sin activos cerca de mínimos"
        />
        <CardSection
          title="⚡ Volumen Anómalo"
          color="var(--orange)"
          items={data.volumen_anomalo || []}
          renderRow={{
            extraHeaders: ['Vol Ratio'],
            extra: (item) => (
              <td style={s.td}>
                <span style={{ color: 'var(--orange)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {item.vol_ratio?.toFixed(1)}x
                </span>
              </td>
            ),
          }}
          emptyMsg="Sin volumen anómalo detectado"
        />
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 20 }}>
      <div className="skeleton" style={{ height: 32, width: 280, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div className="skeleton" style={{ height: 20, width: 140, marginBottom: 12 }} />
            {[1,2,3].map(j => (
              <div key={j} className="skeleton" style={{ height: 14, marginBottom: 8 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  root: { display: 'flex', flexDirection: 'column', gap: 20 },
  pageTitle: { display: 'flex', alignItems: 'baseline', gap: 16 },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--text)' },
  subtitle: { fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: 16 },
  card: { background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid',
    fontWeight: 700, fontSize: 14,
  },
  count: { background: 'var(--bg3)', color: 'var(--text2)', padding: '1px 8px', borderRadius: 10, fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead: { background: 'var(--bg)' },
  th: { padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '9px 12px', color: 'var(--text2)' },
  tdTicker: { padding: '9px 12px', color: 'var(--text)', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 1 },
  tdMono: { padding: '9px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' },
  empty: { padding: '24px 16px', color: 'var(--text3)', fontSize: 13, textAlign: 'center' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center' },
}
