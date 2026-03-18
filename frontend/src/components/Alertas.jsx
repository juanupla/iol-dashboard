import { useState, useEffect } from 'react'
import { api } from '../api'
import { SignalChip } from './shared'

const TIPOS = [{ value:'price', label:'Precio ($)' },{ value:'rsi', label:'RSI' },{ value:'vol_ratio', label:'Vol Ratio' }]
const CONDS = [{ value:'above', label:'supera' },{ value:'below', label:'cae bajo' }]

// Persistencia liviana en localStorage
const STORAGE_KEY = 'iol_alertas_backup'
function saveToLocal(alertas) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alertas)) } catch {}
}
function loadFromLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]') } catch { return [] }
}

export default function Alertas({ refreshKey }) {
  const [alertas,    setAlertas]    = useState([])
  const [disparadas, setDisparadas] = useState([])
  const [form,       setForm]       = useState({ ticker:'', tipo:'price', condicion:'above', valor:'' })
  const [evaluando,  setEvaluando]  = useState(false)
  const [hover,      setHover]      = useState(null)
  const [restored,   setRestored]   = useState(false)

  const load = async () => {
    const d = await api.alertas()
    setAlertas(d.alertas||[])
    setDisparadas(d.disparadas||[])
    saveToLocal(d.alertas||[])
  }

  // Al montar: si el backend no tiene alertas pero hay en localStorage, re-crearlas
  useEffect(() => {
    api.alertas().then(async d => {
      if ((!d.alertas || d.alertas.length===0) && !restored) {
        const backup = loadFromLocal()
        if (backup.length > 0) {
          setRestored(true)
          for (const a of backup) {
            try {
              await api.crearAlerta({ ticker:a.ticker, tipo:a.tipo, condicion:a.condicion, valor:a.valor })
            } catch {}
          }
          await load()
          return
        }
      }
      setAlertas(d.alertas||[])
      setDisparadas(d.disparadas||[])
    }).catch(()=>{})
  }, [refreshKey])

  const setF = (k,v) => setForm(f => ({...f,[k]:v}))

  const agregar = async () => {
    if (!form.ticker||!form.valor) return
    await api.crearAlerta({ ticker:form.ticker.toUpperCase(), tipo:form.tipo, condicion:form.condicion, valor:parseFloat(form.valor) })
    setForm({ ticker:'', tipo:'price', condicion:'above', valor:'' })
    load()
  }

  const evaluar = async () => {
    setEvaluando(true)
    await api.evaluarAlertas()
    await load()
    setEvaluando(false)
  }

  const labelFor = (a) => {
    const t = TIPOS.find(x=>x.value===a.tipo)?.label||a.tipo
    const c = CONDS.find(x=>x.value===a.condicion)?.label||a.condicion
    return `${t} ${c} ${a.valor}`
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Alertas de mercado</h2>
          <p style={s.hint}>Se evalúan automáticamente en cada scan (lun-vie 11-17hs). Las alertas se guardan localmente y se restauran si el servidor reinicia.</p>
        </div>
        <button onClick={evaluar} disabled={evaluando} style={s.evalBtn}>
          {evaluando ? '⏳ Evaluando...' : '⚡ Evaluar ahora'}
        </button>
      </div>

      {/* Form */}
      <div style={s.formCard}>
        <p style={s.formLabel}>Nueva alerta</p>
        <div style={s.formRow}>
          <input placeholder="Ticker (ej: GGAL)" value={form.ticker}
            onChange={e => setF('ticker', e.target.value.toUpperCase())} style={s.input} />
          <select value={form.tipo}      onChange={e => setF('tipo', e.target.value)}      style={s.select}>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={form.condicion} onChange={e => setF('condicion', e.target.value)} style={s.select}>
            {CONDS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input type="number" placeholder="Valor" value={form.valor}
            onChange={e => setF('valor', e.target.value)}
            style={{ ...s.input, width:100 }}
            onKeyDown={e => e.key==='Enter' && agregar()} />
          <button onClick={agregar} style={s.addBtn}>+ Agregar</button>
        </div>
      </div>

      {/* Disparadas - destacadas primero */}
      {disparadas.length > 0 && (
        <div style={s.section}>
          <p style={{ ...s.sectionLabel, color:'var(--green)' }}>🔔 DISPARADAS ({disparadas.length})</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {disparadas.map((a,i) => (
              <div key={i} style={s.triggeredCard}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={s.triggeredTicker}>{a.ticker}</span>
                  <span style={s.triggeredDetail}>{labelFor(a)}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--green)', fontWeight:500 }}>→ {a.valor_actual}</span>
                  {a.signal && <SignalChip signal={a.signal} size="small" />}
                  <span style={{ marginLeft:'auto', fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' }}>
                    {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('es-AR') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activas */}
      {alertas.length > 0 && (
        <div style={s.section}>
          <p style={s.sectionLabel}>ACTIVAS ({alertas.length})</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {alertas.map(a => (
              <div key={a.id}
                onMouseEnter={() => setHover(a.id)}
                onMouseLeave={() => setHover(null)}
                style={{ ...s.chip,
                  borderColor: a.triggered?'var(--green)':hover===a.id?'var(--border2)':'var(--border)',
                  background: hover===a.id?'var(--bg3)':'var(--bg2)' }}>
                <span style={s.chipTicker}>{a.ticker}</span>
                <span style={s.chipLabel}>{labelFor(a)}</span>
                {a.triggered && <span style={{ color:'var(--green)', fontSize:11 }}>✓</span>}
                <button onClick={() => api.eliminarAlerta(a.id).then(load)} style={s.removeBtn}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertas.length===0 && disparadas.length===0 && (
        <div style={s.empty}>
          <span style={{ fontSize:40 }}>🔔</span>
          <p style={{ color:'var(--text2)', marginTop:12, fontSize:15, fontWeight:500 }}>Sin alertas configuradas</p>
          <p style={{ color:'var(--text3)', fontSize:12, marginTop:4, maxWidth:340, textAlign:'center' }}>
            Configurá alertas de precio, RSI o volumen. Se evalúan automáticamente con cada scan.
          </p>
        </div>
      )}
    </div>
  )
}

const s = {
  root:    { display:'flex', flexDirection:'column', gap:20 },
  header:  { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' },
  title:   { fontSize:20, fontWeight:600, color:'var(--text)', fontFamily:'var(--cond)', letterSpacing:.5 },
  hint:    { color:'var(--text3)', fontSize:12, marginTop:3, maxWidth:500 },
  evalBtn: { background:'var(--bg3)', border:'1px solid var(--green)', color:'var(--green)',
    padding:'8px 16px', borderRadius:'var(--radius-sm)', fontSize:13,
    fontFamily:'var(--cond)', fontWeight:600, letterSpacing:.5, flexShrink:0 },
  formCard:  { background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px' },
  formLabel: { fontFamily:'var(--cond)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 },
  formRow:   { display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' },
  input:  { background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text)',
    padding:'6px 10px', borderRadius:'var(--radius-sm)', fontSize:13, width:140, outline:'none' },
  select: { background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text2)',
    padding:'6px 8px', borderRadius:'var(--radius-sm)', fontSize:13 },
  addBtn: { background:'linear-gradient(135deg,#00b87a,#007a50)', border:'none', color:'#fff',
    padding:'7px 16px', borderRadius:'var(--radius-sm)', fontSize:13,
    fontFamily:'var(--cond)', fontWeight:600, letterSpacing:.5 },
  section:      {},
  sectionLabel: { fontFamily:'var(--cond)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:2, marginBottom:8 },
  triggeredCard: { padding:'10px 14px', background:'#001f10', border:'1px solid var(--green2)', borderRadius:'var(--radius-sm)' },
  triggeredTicker: { fontFamily:'var(--mono)', fontWeight:500, fontSize:14, color:'var(--text)' },
  triggeredDetail: { color:'var(--text3)', fontSize:12 },
  chip:       { display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:20, border:'1px solid', transition:'all .15s' },
  chipTicker: { fontFamily:'var(--mono)', fontWeight:500, fontSize:13, color:'var(--text)' },
  chipLabel:  { color:'var(--text3)', fontSize:12 },
  removeBtn:  { background:'none', border:'none', color:'var(--text3)', fontSize:13, padding:0, marginLeft:2 },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 0' },
}
