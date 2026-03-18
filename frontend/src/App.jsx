import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from './api'
import Oportunidades from './components/Oportunidades'
import Screener from './components/Screener'
import Portafolio from './components/Portafolio'
import Alertas from './components/Alertas'
import StatusBar from './components/StatusBar'

const TABS = [
  { id:'oportunidades', icon:'🎯', label:'Oportunidades' },
  { id:'screener',      icon:'📡', label:'Screener' },
  { id:'portafolio',    icon:'💼', label:'Portafolio' },
  { id:'alertas',       icon:'🔔', label:'Alertas' },
]

export default function App() {
  const [tab,        setTab]        = useState('oportunidades')
  const [status,     setStatus]     = useState(null)
  const [alertCount, setAlertCount] = useState(0)
  const lastRunRef = useRef(null)
  // Callback que los hijos pueden llamar para forzar refresh de sus datos
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchStatus = useCallback(async () => {
    try {
      const s = await api.status()
      setStatus(s)
      // Auto-refresh: si el last_run cambió, notificamos a los hijos
      if (s.last_run && s.last_run !== lastRunRef.current && !s.running) {
        if (lastRunRef.current !== null) {
          setRefreshKey(k => k + 1)
        }
        lastRunRef.current = s.last_run
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 15000)
    return () => clearInterval(id)
  }, [fetchStatus])

  useEffect(() => {
    api.alertas().then(d => setAlertCount(d.disparadas?.length||0)).catch(()=>{})
  }, [tab, refreshKey])

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.brand}>
          <span style={s.brandAccent}>IOL</span>
          <span style={s.brandSub}>SCANNER</span>
        </div>
        <nav style={s.nav} className="hide-mobile">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={tab===t.id ? {...s.navBtn,...s.navBtnActive} : s.navBtn}>
              <span>{t.icon}</span>{t.label}
              {t.id==='alertas' && alertCount>0 && <span style={s.badge}>{alertCount}</span>}
            </button>
          ))}
        </nav>
        <StatusBar status={status} onRefresh={() => api.refreshScreener().then(fetchStatus)} />
      </header>

      {/* Mobile bottom nav */}
      <nav style={s.mobileNav} className="show-mobile">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={tab===t.id ? {...s.mobileBtn,...s.mobileBtnActive} : s.mobileBtn}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontSize:10, marginTop:1 }}>{t.label}</span>
            {t.id==='alertas' && alertCount>0 && <span style={s.mobileBadge}>{alertCount}</span>}
          </button>
        ))}
      </nav>

      <main style={s.main}>
        <div className="animate-in" key={tab}>
          {tab==='oportunidades' && <Oportunidades refreshKey={refreshKey} />}
          {tab==='screener'      && <Screener refreshKey={refreshKey} />}
          {tab==='portafolio'    && <Portafolio refreshKey={refreshKey} />}
          {tab==='alertas'       && <Alertas refreshKey={refreshKey} />}
        </div>
      </main>
    </div>
  )
}

const s = {
  app:    { display:'flex', flexDirection:'column', minHeight:'100vh' },
  header: { display:'flex', alignItems:'center', gap:16, padding:'0 16px', height:50,
    background:'var(--bg1)', borderBottom:'1px solid var(--border)',
    position:'sticky', top:0, zIndex:100 },
  brand:       { display:'flex', alignItems:'baseline', gap:5, flexShrink:0 },
  brandAccent: { fontFamily:'var(--mono)', fontWeight:500, fontSize:17, color:'var(--green)', letterSpacing:3 },
  brandSub:    { fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', letterSpacing:5 },
  nav:    { display:'flex', gap:2, flex:1 },
  navBtn: { display:'flex', alignItems:'center', gap:6, background:'none', color:'var(--text3)',
    padding:'6px 12px', borderRadius:'var(--radius-sm)', fontSize:13, fontWeight:500,
    fontFamily:'var(--cond)', letterSpacing:.5, transition:'all .15s', position:'relative' },
  navBtnActive: { background:'var(--bg3)', color:'var(--text)', borderBottom:'2px solid var(--green)' },
  badge:  { background:'var(--red)', color:'#fff', fontSize:9, fontWeight:700,
    borderRadius:8, padding:'1px 4px', minWidth:14, textAlign:'center' },
  mobileNav: { display:'flex', background:'var(--bg1)', borderBottom:'1px solid var(--border)',
    position:'sticky', top:50, zIndex:99 },
  mobileBtn: { flex:1, display:'flex', flexDirection:'column', alignItems:'center',
    padding:'8px 4px', background:'none', color:'var(--text3)', fontSize:11,
    fontFamily:'var(--cond)', position:'relative', borderBottom:'2px solid transparent', transition:'all .15s' },
  mobileBtnActive: { color:'var(--green)', borderBottomColor:'var(--green)' },
  mobileBadge: { position:'absolute', top:4, right:'calc(50% - 14px)',
    background:'var(--red)', color:'#fff', fontSize:8, fontWeight:700, borderRadius:6, padding:'1px 3px' },
  main: { flex:1, padding:16, maxWidth:1800, margin:'0 auto', width:'100%' },
}
