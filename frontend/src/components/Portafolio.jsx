import { useState, useEffect } from 'react'
import { api } from '../api'
import { SignalChip, Pct, ReasonTags } from './shared'

function Money({ v }) {
  if (v==null) return <span style={{ color:'var(--text3)', fontFamily:'var(--mono)', fontSize:12 }}>—</span>
  const c = v>0?'var(--green)':v<0?'var(--red)':'var(--text3)'
  return <span style={{ fontFamily:'var(--mono)', fontSize:12, color:c, fontWeight:500 }}>
    {v>0?'+':v<0?'-':''}${Math.abs(v).toLocaleString('es-AR',{maximumFractionDigits:0})}
  </span>
}

function SummaryCard({ label, value, sub, color, accent }) {
  return (
    <div style={{ flex:1, minWidth:140, padding:'14px 16px', background:'var(--bg1)', borderRadius:'var(--radius)',
      border: accent ? `1px solid ${color||'var(--green)'}` : '1px solid var(--border)' }}>
      <p style={{ fontFamily:'var(--cond)', fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:2, marginBottom:6 }}>{label}</p>
      <p style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:500, color:color||'var(--text)' }}>{value}</p>
      {sub && <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginTop:3 }}>{sub}</p>}
    </div>
  )
}

const labelS = { display:'block', fontFamily:'var(--cond)', fontSize:9, color:'var(--text3)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }

function PortfolioRow({ pos }) {
  const [hover, setHover] = useState(false)
  const ticker = pos.titulo?.simbolo
  const gp     = pos.gananciaDinero||0
  const gpPct  = pos.gananciaPorcentaje||0
  const varD   = pos.variacionDiaria||0
  const sc     = pos.screener

  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderBottom:'1px solid var(--border)', background:hover?'var(--bg3)':'transparent', transition:'background .12s' }}>
      <td style={td.ticker}>
        <div>{ticker}</div>
        <div style={{ fontFamily:'var(--cond)', fontSize:9, color:'var(--text3)', letterSpacing:1, textTransform:'uppercase' }}>{pos.titulo?.tipo}</div>
      </td>
      <td style={td.n}><span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>{pos.cantidad?.toLocaleString('es-AR')}</span></td>
      <td style={td.n}><span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>${pos.ppc?.toLocaleString('es-AR',{maximumFractionDigits:2})}</span></td>
      <td style={td.n}><span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>${pos.ultimoPrecio?.toLocaleString('es-AR',{maximumFractionDigits:2})}</span></td>
      <td style={td.n}><span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text)', fontWeight:500 }}>${pos.valorizado?.toLocaleString('es-AR',{maximumFractionDigits:0})}</span></td>
      <td style={td.n}><Money v={gp} /></td>
      <td style={td.n}><Pct v={gpPct} /></td>
      <td style={td.n}><Pct v={varD} /></td>
      <td style={td.n}>{sc?.signal ? <SignalChip signal={sc.signal} size="small" /> : <span style={{ color:'var(--text3)', fontSize:12 }}>—</span>}</td>
      <td style={{ ...td.n, minWidth:160 }} className="hide-mobile"><ReasonTags reasons={sc?.reasons} /></td>
    </tr>
  )
}

function MobileCard({ pos }) {
  const [open, setOpen] = useState(false)
  const ticker = pos.titulo?.simbolo
  const gp = pos.gananciaDinero||0
  const gpPct = pos.gananciaPorcentaje||0
  const sc = pos.screener
  return (
    <div onClick={() => setOpen(o=>!o)}
      style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px 12px', marginBottom:4, cursor:'pointer' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontFamily:'var(--mono)', fontWeight:500, fontSize:14, color:'var(--text)', minWidth:55 }}>{ticker}</span>
        <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text2)' }}>${pos.valorizado?.toLocaleString('es-AR',{maximumFractionDigits:0})}</span>
        <Money v={gp} />
        {sc?.signal && <SignalChip signal={sc.signal} size="small" />}
      </div>
      {open && (
        <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12 }}>
          <div><span style={labelS}>Cantidad</span><span style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>{pos.cantidad?.toLocaleString('es-AR')}</span></div>
          <div><span style={labelS}>PPC</span><span style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>${pos.ppc?.toFixed(2)}</span></div>
          <div><span style={labelS}>Último</span><span style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>${pos.ultimoPrecio?.toFixed(2)}</span></div>
          <div><span style={labelS}>G/P %</span><Pct v={gpPct} /></div>
        </div>
      )}
    </div>
  )
}

export default function Portafolio({ refreshKey }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = () => {
    setLoading(true)
    api.portafolio()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [refreshKey])

  if (loading) return <div style={s.loading}>Cargando portafolio...</div>
  if (error)   return <div style={s.error}>{error}</div>

  const activos  = data?.data?.activos||[]
  const totalVal = activos.reduce((a,x) => a+(x.valorizado||0), 0)
  const totalGP  = activos.reduce((a,x) => a+(x.gananciaDinero||0), 0)
  const totalGPPct = activos.length>0 ? activos.reduce((a,x)=>a+(x.gananciaPorcentaje||0),0)/activos.length : 0

  return (
    <div style={s.root}>
      <div style={s.summary}>
        <SummaryCard label="Posiciones" value={activos.length} />
        <SummaryCard label="Valorizado total"
          value={`$${totalVal.toLocaleString('es-AR',{maximumFractionDigits:0})}`}
          accent color="var(--blue)" />
        <SummaryCard label="Ganancia / Pérdida"
          value={`${totalGP>=0?'+':'-'}$${Math.abs(totalGP).toLocaleString('es-AR',{maximumFractionDigits:0})}`}
          sub={`Promedio ${totalGPPct>=0?'+':''}${totalGPPct.toFixed(2)}%`}
          color={totalGP>=0?'var(--green)':'var(--red)'} accent />
        <button onClick={load} style={s.refreshBtn}>↻ Actualizar</button>
      </div>

      <div style={s.tableWrap} className="hide-mobile">
        <table style={s.table}>
          <thead>
            <tr>
              {['TICKER','CANTIDAD','PPC','ÚLTIMO','VALORIZADO','G/P $','G/P %','VAR HOY','SEÑAL','ANÁLISIS'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activos.map(pos => <PortfolioRow key={pos.titulo?.simbolo} pos={pos} />)}
          </tbody>
        </table>
        {activos.length===0 && <p style={s.empty}>No hay posiciones.</p>}
      </div>

      <div className="show-mobile">
        {activos.map(pos => <MobileCard key={pos.titulo?.simbolo} pos={pos} />)}
      </div>
    </div>
  )
}

const s = {
  root:       { display:'flex', flexDirection:'column', gap:14 },
  summary:    { display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' },
  refreshBtn: { background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text2)',
    padding:'8px 14px', borderRadius:'var(--radius-sm)', fontSize:13, fontFamily:'var(--cond)', letterSpacing:.5 },
  tableWrap:  { overflowX:'auto', background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:'var(--radius)' },
  table:      { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th:         { padding:'8px 12px', textAlign:'left', color:'var(--text3)', fontSize:9, fontWeight:600,
    fontFamily:'var(--cond)', textTransform:'uppercase', letterSpacing:1.5,
    background:'var(--bg)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' },
  empty:      { padding:32, color:'var(--text3)', textAlign:'center', fontSize:13 },
  loading:    { padding:60, textAlign:'center', color:'var(--text3)' },
  error:      { padding:32, color:'var(--red)', background:'var(--bg1)', borderRadius:'var(--radius)', border:'1px solid var(--red)' },
}
const td = {
  ticker: { padding:'8px 12px', color:'var(--text)', fontFamily:'var(--mono)', fontWeight:500, fontSize:13 },
  n:      { padding:'8px 12px', color:'var(--text2)' },
}
