import { useState, useEffect } from 'react'
import { getMercadoStatus } from './shared'

export default function StatusBar({ status, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false)
  const [mercado, setMercado] = useState(getMercadoStatus())

  // Actualiza el estado del mercado cada minuto
  useEffect(() => {
    const id = setInterval(() => setMercado(getMercadoStatus()), 60000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 2000)
  }

  const isRunning = status?.running
  const lastRun   = status?.last_run
    ? new Date(status.last_run).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
    : null
  const pct = isRunning && status.total>0 ? Math.round((status.progress/status.total)*100) : null

  return (
    <div style={s.wrap}>
      {/* Indicador mercado abierto/cerrado */}
      <div style={s.mercado}>
        <div style={{ ...s.dot, background: mercado.isOpen ? 'var(--green)' : 'var(--text3)',
          boxShadow: mercado.isOpen ? '0 0 6px var(--green)' : 'none',
          animation: mercado.isOpen ? 'pulse 2s infinite' : 'none' }} />
        <span style={{ ...s.mercadoText, color: mercado.isOpen ? 'var(--green)' : 'var(--text3)' }}>
          {mercado.isOpen ? 'ABIERTO' : 'CERRADO'}
        </span>
        <span style={s.nextEvent} className="hide-mobile">{mercado.nextEvent}</span>
      </div>

      <div style={s.divider} className="hide-mobile" />

      {/* Estado del screener */}
      {isRunning ? (
        <div style={s.running}>
          <div style={s.dotActive} />
          <span style={s.runText}>{pct}% ({status.progress}/{status.total})</span>
          <div style={s.progWrap}>
            <div style={{ ...s.progBar, width:`${pct}%` }} />
          </div>
        </div>
      ) : lastRun ? (
        <span style={s.lastRun} className="hide-mobile">scan {lastRun}</span>
      ) : null}

      {/* Botón refresh */}
      <button onClick={handleRefresh} disabled={isRunning||refreshing}
        style={s.btn} title="Ejecutar screener ahora">
        <span style={{ display:'inline-block', animation:isRunning?'spin 1s linear infinite':'none', fontSize:15 }}>↻</span>
      </button>
    </div>
  )
}

const s = {
  wrap:      { display:'flex', alignItems:'center', gap:10, marginLeft:'auto' },
  mercado:   { display:'flex', alignItems:'center', gap:5 },
  dot:       { width:6, height:6, borderRadius:'50%', flexShrink:0 },
  dotActive: { width:6, height:6, borderRadius:'50%', background:'var(--green)', flexShrink:0, boxShadow:'0 0 6px var(--green)', animation:'pulse 1s infinite' },
  mercadoText:{ fontFamily:'var(--mono)', fontSize:10, fontWeight:500, letterSpacing:1 },
  nextEvent: { fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' },
  divider:   { width:1, height:16, background:'var(--border2)' },
  running:   { display:'flex', alignItems:'center', gap:6 },
  runText:   { fontFamily:'var(--mono)', fontSize:10, color:'var(--text2)', whiteSpace:'nowrap' },
  progWrap:  { width:50, height:2, background:'var(--bg3)', borderRadius:1 },
  progBar:   { height:'100%', background:'var(--green)', borderRadius:1, transition:'width .3s', maxWidth:'100%' },
  lastRun:   { fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)', whiteSpace:'nowrap' },
  btn:       { background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text2)', padding:'4px 10px', borderRadius:'var(--radius-sm)', flexShrink:0 },
}
