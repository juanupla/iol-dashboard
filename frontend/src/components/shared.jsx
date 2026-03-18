// ── Helpers compartidos ───────────────────────────────────────────────────────

export const SIGNAL_META = {
  'COMPRA FUERTE': { color:'#00e5a0', bg:'#002918', border:'#00b87a', rank:1 },
  'COMPRA':        { color:'#00c880', bg:'#001f12', border:'#007a4d', rank:2 },
  'ALCISTA':       { color:'#4d9fff', bg:'#001428', border:'#1a5c99', rank:3 },
  'NEUTRO':        { color:'#50507a', bg:'transparent', border:'#1c1c3a', rank:4 },
  'BAJISTA':       { color:'#ffd060', bg:'#1e1800', border:'#7a5c00', rank:5 },
  'VENTA':         { color:'#ff3860', bg:'#200010', border:'#7a001a', rank:6 },
  'VENTA FUERTE':  { color:'#ff1040', bg:'#2d0015', border:'#cc0030', rank:7 },
}

export function getScoreClass(score) {
  if (score >= 5)  return 'score-5'
  if (score >= 4)  return 'score-4'
  if (score >= 3)  return 'score-3'
  if (score >= 2)  return 'score-2'
  if (score <= -4) return 'score-n4'
  if (score <= -3) return 'score-n3'
  if (score <= -2) return 'score-n2'
  return ''
}

// Calcula si el mercado argentino está abierto ahora mismo
export function getMercadoStatus() {
  const now = new Date()
  const ba  = new Date(now.toLocaleString('en-US', { timeZone:'America/Argentina/Buenos_Aires' }))
  const day = ba.getDay()   // 0=dom, 6=sab
  const h   = ba.getHours()
  const m   = ba.getMinutes()
  const mins = h * 60 + m
  const isWeekday = day >= 1 && day <= 5
  const isOpen    = isWeekday && mins >= 11*60 && mins < 17*60
  const openMin   = 11*60
  const closeMin  = 17*60

  let nextEvent = ''
  if (!isWeekday) {
    nextEvent = 'Abre el lunes 11:00'
  } else if (mins < openMin) {
    const diff = openMin - mins
    nextEvent = `Abre en ${Math.floor(diff/60)}h ${diff%60}m`
  } else if (mins >= closeMin) {
    nextEvent = 'Abre mañana 11:00'
  } else {
    const diff = closeMin - mins
    nextEvent = `Cierra en ${Math.floor(diff/60)}h ${diff%60}m`
  }
  return { isOpen, nextEvent }
}

export function Pct({ v, size=12 }) {
  if (v == null) return <span style={{ color:'var(--text3)', fontFamily:'var(--mono)', fontSize:size }}>—</span>
  const c = v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text3)'
  return <span style={{ fontFamily:'var(--mono)', fontSize:size, color:c, fontWeight:500 }}>{v > 0?'+':''}{v.toFixed(2)}%</span>
}

export function Price({ v, size=12 }) {
  if (v == null) return <span style={{ color:'var(--text3)', fontFamily:'var(--mono)', fontSize:size }}>—</span>
  return <span style={{ fontFamily:'var(--mono)', fontSize:size, color:'var(--text2)' }}>${typeof v==='number'?v.toLocaleString('es-AR',{maximumFractionDigits:2}):v}</span>
}

export function RsiPill({ v }) {
  if (v == null) return <span style={{ color:'var(--text3)', fontFamily:'var(--mono)', fontSize:12 }}>—</span>
  const low=v<=30, high=v>=70
  return (
    <span style={{
      fontFamily:'var(--mono)', fontSize:12, fontWeight:500,
      color:     low?'var(--green)':high?'var(--red)':'var(--text2)',
      background:low?'var(--green3)':high?'var(--red3)':'transparent',
      border:    low?'1px solid var(--green2)':high?'1px solid var(--red2)':'none',
      padding:   (low||high)?'1px 6px':'0', borderRadius:4,
    }}>{v}</span>
  )
}

export function SignalChip({ signal, size='normal' }) {
  const m = SIGNAL_META[signal] || SIGNAL_META['NEUTRO']
  const sm = size==='small'
  return (
    <span style={{
      color:m.color, background:m.bg, border:`1px solid ${m.border}`,
      padding:sm?'1px 7px':'2px 9px', borderRadius:4,
      fontSize:sm?10:11, fontWeight:700, fontFamily:'var(--cond)',
      letterSpacing:1, whiteSpace:'nowrap',
    }}>{signal}</span>
  )
}

export function ScoreDisplay({ score }) {
  if (score==null) return <span style={{ color:'var(--text3)' }}>—</span>
  const c = score>0?'var(--green)':score<0?'var(--red)':'var(--text3)'
  const bars = Math.min(Math.abs(score), 5)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:12, color:c, fontWeight:500, minWidth:22, textAlign:'right' }}>
        {score>0?'+':''}{score}
      </span>
      <div style={{ display:'flex', gap:2 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ width:4, height:12, borderRadius:2,
            background: i<=bars?(score>0?'var(--green2)':'var(--red2)'):'var(--bg4)' }} />
        ))}
      </div>
    </div>
  )
}

export function TrendArrow({ current, previous }) {
  if (current==null || previous==null) return null
  const up = current > previous
  const eq = Math.abs(current-previous) < 0.01
  if (eq) return <span style={{ color:'var(--text3)', fontSize:10 }}>→</span>
  return <span style={{ color:up?'var(--green)':'var(--red)', fontSize:11, marginLeft:3 }}>{up?'↑':'↓'}</span>
}

export function ReasonTags({ reasons }) {
  if (!reasons?.length) return null
  const RSTYLE = {
    positivo:      { bg:'#001f10', border:'#00804d', color:'#00cc6a', icon:'▲' },
    leve_positivo: { bg:'#0a1a10', border:'#1a5c30', color:'#4db87a', icon:'↑' },
    negativo:      { bg:'#1f0008', border:'#800020', color:'#cc2244', icon:'▼' },
    alerta:        { bg:'#1a1000', border:'#7a4400', color:'#cc7700', icon:'⚡' },
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      {reasons.map((r,i) => {
        const isObj = typeof r==='object'
        const texto = isObj?r.texto:r
        const tipo  = isObj?r.tipo:'leve_positivo'
        const st    = RSTYLE[tipo]||RSTYLE.leve_positivo
        return (
          <span key={i} style={{
            display:'inline-flex', alignItems:'center', gap:4,
            background:st.bg, border:`1px solid ${st.border}`, color:st.color,
            padding:'2px 6px', borderRadius:3, fontSize:10, fontWeight:500,
            whiteSpace:'nowrap', fontFamily:'var(--cond)', letterSpacing:.3,
          }}>
            <span style={{ fontSize:8 }}>{st.icon}</span>{texto}
          </span>
        )
      })}
    </div>
  )
}

export function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 20px', textAlign:'center' }}>
      <span style={{ fontSize:44, marginBottom:12 }}>{icon}</span>
      <p style={{ color:'var(--text2)', fontSize:16, fontWeight:600, marginBottom:6 }}>{title}</p>
      <p style={{ color:'var(--text3)', fontSize:13, maxWidth:360 }}>{desc}</p>
    </div>
  )
}
