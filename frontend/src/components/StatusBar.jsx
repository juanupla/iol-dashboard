import { useState } from 'react'

export default function StatusBar({ status, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 2000)
  }

  const isRunning = status?.running
  const lastRun = status?.last_run
    ? new Date(status.last_run).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div style={s.wrap}>
      <div style={s.dot(isRunning)} />
      <span style={s.text}>
        {isRunning
          ? `Escaneando... ${status.progress}/${status.total}`
          : lastRun
            ? `Actualizado ${lastRun}`
            : 'Sin datos aún'}
      </span>
      {isRunning && (
        <div style={s.progressWrap}>
          <div style={s.progressBar(status.progress, status.total)} />
        </div>
      )}
      <button
        onClick={handleRefresh}
        disabled={isRunning || refreshing}
        style={s.btn}
        title="Ejecutar screener ahora"
      >
        {refreshing ? '...' : '↻'}
      </button>
    </div>
  )
}

const s = {
  wrap: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  dot: (active) => ({
    width: 7, height: 7, borderRadius: '50%',
    background: active ? 'var(--green)' : 'var(--text3)',
    boxShadow: active ? '0 0 8px var(--green)' : 'none',
    animation: active ? 'pulse-line 1s infinite' : 'none',
  }),
  text: { color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--mono)' },
  progressWrap: { width: 80, height: 3, background: 'var(--bg3)', borderRadius: 2 },
  progressBar: (p, t) => ({
    height: '100%',
    width: t ? `${(p / t) * 100}%` : '0%',
    background: 'var(--accent)',
    borderRadius: 2,
    transition: 'width .3s',
  }),
  btn: {
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    color: 'var(--text2)', padding: '4px 10px',
    borderRadius: 6, fontSize: 14,
  },
}
