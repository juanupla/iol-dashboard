import { useState, useEffect } from 'react'
import { api } from '../api'
import { SignalChip, ScoreDisplay, RsiPill, Pct, ReasonTags, getScoreClass, getMercadoStatus } from './shared'

function sortCompras(items) {
  return [...items].sort((a,b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.rsi??50) - (b.rsi??50)  // RSI más bajo primero (más sobrevendido)
  })
}
function sortVentas(items) {
  return [...items].sort((a,b) => {
    if (a.score !== b.score) return a.score - b.score
    return (b.rsi??50) - (a.rsi??50)  // RSI más alto primero (más sobrecomprado)
  })
}

function OportunidadRow({ item }) {
  const [hover, setHover] = useState(false)
  const sc = getScoreClass(item.score)
  return (
    <div className={sc}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display:'grid', gridTemplateColumns:'90px 95px 64px 90px 80px 1fr',
        gap:'0 10px', alignItems:'center',
        padding:'9px 14px', borderRadius:'var(--radius-sm)',
        borderLeft:'2px solid var(--border)', marginBottom:3,
        transition:'background .12s',
        background: hover ? 'var(--bg3)' : 'var(--bg2)',
      }}>
      <div>
        <div style={{ fontFamily:'var(--mono)', fontWeight:500, fontSize:14, color:'var(--text)' }}>{item.ticker}</div>
        <div style={{ fontFamily:'var(--cond)', fontSize:9, color:'var(--text3)', letterSpacing:1, textTransform:'uppercase', marginTop:1 }}>{item.grupo}</div>
      </div>
      <div>
        <div style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text2)' }}>${(item.price||0).toLocaleString('es-AR',{maximumFractionDigits:2})}</div>
        <Pct v={item.var_dia} size={11} />
      </div>
      <RsiPill v={item.rsi} />
      <ScoreDisplay score={item.score} />
      <SignalChip signal={item.signal} size="small" />
      <div className="hide-mobile"><ReasonTags reasons={item.reasons} /></div>
    </div>
  )
}

function Panel({ title, color, items, emptyMsg }) {
  return (
    <div style={s.panel}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, padding:'0 4px' }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:2, color }}>{title}</span>
        <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', background:'var(--bg3)', padding:'1px 8px', borderRadius:10 }}>{items.length}</span>
      </div>
      {items.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'90px 95px 64px 90px 80px 1fr', gap:'0 10px', padding:'3px 14px', marginBottom:4 }}>
          {['TICKER','PRECIO','RSI','SCORE','SEÑAL','ANÁLISIS'].map(h => (
            <span key={h} style={{ fontFamily:'var(--cond)', fontSize:9, color:'var(--text3)', letterSpacing:1.5 }}
              className={h==='ANÁLISIS'?'hide-mobile':''}>{h}</span>
          ))}
        </div>
      )}
      {items.length===0
        ? <p style={{ color:'var(--text3)', fontSize:12, padding:'14px' }}>{emptyMsg}</p>
        : items.map(item => <OportunidadRow key={item.ticker} item={item} />)
      }
    </div>
  )
}

export default function Oportunidades({ refreshKey }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const mercado = getMercadoStatus()

  const load = () => {
    setLoading(true)
    api.oportunidades().then(setData).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [refreshKey])

  if (loading) return <LoadingSkeleton />

  const noData = !data || (!data.top_compras?.length && !data.top_ventas?.length && !data.cerca_minimo_52w?.length && !data.volumen_anomalo?.length)

  return (
    <div style={s.root}>
      {/* Info bar */}
      <div style={s.infoBar}>
        {data?.last_run && (
          <span style={s.lastRun}>Último scan: {new Date(data.last_run).toLocaleString('es-AR')}</span>
        )}
        {noData && (
          <div style={s.noDataNote}>
            {mercado.isOpen
              ? '⏳ El screener está corriendo por primera vez...'
              : `🌙 Mercado cerrado — ${mercado.nextEvent}. Los datos se actualizan automáticamente cuando abre.`}
          </div>
        )}
      </div>

      {!noData && (
        <>
          <div style={s.mainGrid}>
            <Panel title="🟢 Mejores oportunidades de compra" color="var(--green)" items={sortCompras(data.top_compras||[])} emptyMsg="Sin señales de compra" />
            <Panel title="🔴 Señales de venta / tomar ganancia" color="var(--red)"   items={sortVentas(data.top_ventas||[])}  emptyMsg="Sin señales de venta" />
          </div>
          <div style={s.secondGrid}>
            <Panel title="📍 Cerca del mínimo 52 semanas" color="var(--yellow)" items={(data.cerca_minimo_52w||[]).slice(0,8)} emptyMsg="Sin activos cerca de mínimos" />
            <Panel title="⚡ Volumen anómalo"              color="var(--orange)" items={(data.volumen_anomalo||[]).slice(0,8)}  emptyMsg="Sin volumen anómalo" />
          </div>
        </>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="skeleton" style={{ height:18, width:220 }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:14 }}>
            <div className="skeleton" style={{ height:14, width:140, marginBottom:12 }} />
            {[1,2,3,4].map(j => <div key={j} className="skeleton" style={{ height:36, marginBottom:4, borderRadius:'var(--radius-sm)' }} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  root:       { display:'flex', flexDirection:'column', gap:14 },
  infoBar:    { display:'flex', flexDirection:'column', gap:6 },
  lastRun:    { fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', textAlign:'right' },
  noDataNote: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 16px', color:'var(--text3)', fontSize:13, textAlign:'center' },
  mainGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,540px),1fr))', gap:14 },
  secondGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,480px),1fr))', gap:14 },
  panel:      { background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:14, overflow:'hidden' },
}
