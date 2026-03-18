import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import Screener from './components/Screener'
import Oportunidades from './components/Oportunidades'
import Portafolio from './components/Portafolio'
import Alertas from './components/Alertas'
import StatusBar from './components/StatusBar'

const TABS = [
  { id: 'oportunidades', label: '🎯 Oportunidades' },
  { id: 'screener',      label: '🔍 Screener' },
  { id: 'portafolio',    label: '📊 Portafolio' },
  { id: 'alertas',       label: '🔔 Alertas' },
]

export default function App() {
  const [tab, setTab] = useState('oportunidades')
  const [status, setStatus] = useState(null)
  const [alertCount, setAlertCount] = useState(0)

  const fetchStatus = useCallback(async () => {
    try {
      const s = await api.status()
      setStatus(s)
    } catch {}
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 15000)
    return () => clearInterval(id)
  }, [fetchStatus])

  useEffect(() => {
    api.alertas().then(d => {
      setAlertCount(d.disparadas?.length || 0)
    }).catch(() => {})
  }, [tab])

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.logo}>
          <span style={s.logoMain}>IOL</span>
          <span style={s.logoSub}>DASHBOARD</span>
        </div>

        <nav style={s.nav}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? s.tabActive : s.tab}
            >
              {t.label}
              {t.id === 'alertas' && alertCount > 0 && (
                <span style={s.badge}>{alertCount}</span>
              )}
            </button>
          ))}
        </nav>

        <StatusBar status={status} onRefresh={() => {
          api.refreshScreener().then(fetchStatus)
        }} />
      </header>

      <main style={s.main}>
        <div className="animate-in" key={tab}>
          {tab === 'oportunidades' && <Oportunidades />}
          {tab === 'screener'      && <Screener />}
          {tab === 'portafolio'    && <Portafolio />}
          {tab === 'alertas'       && <Alertas />}
        </div>
      </main>
    </div>
  )
}

const s = {
  app: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' },
  header: {
    display: 'flex', alignItems: 'center', gap: 24,
    padding: '0 20px', height: 52,
    background: 'var(--bg1)', borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo: { display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 },
  logoMain: { fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 18, color: 'var(--accent2)', letterSpacing: 3 },
  logoSub:  { fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: 4 },
  nav: { display: 'flex', gap: 2, flex: 1 },
  tab: {
    background: 'none', border: 'none', color: 'var(--text3)',
    padding: '6px 14px', borderRadius: 6, fontSize: 13,
    transition: 'all .15s', position: 'relative',
  },
  tabActive: {
    background: 'var(--bg3)', border: 'none', color: 'var(--text)',
    padding: '6px 14px', borderRadius: 6, fontSize: 13,
    fontWeight: 600, position: 'relative',
  },
  badge: {
    position: 'absolute', top: 2, right: 4,
    background: 'var(--red)', color: '#fff',
    fontSize: 10, fontWeight: 700, borderRadius: 8,
    padding: '1px 5px', minWidth: 16, textAlign: 'center',
  },
  main: { flex: 1, padding: 20, maxWidth: 1600, margin: '0 auto', width: '100%' },
}
