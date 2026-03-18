import { useState, useEffect } from 'react'
import { api } from '../api'

const TIPOS = [
  { value: 'price',     label: 'Precio ($)' },
  { value: 'rsi',       label: 'RSI' },
  { value: 'vol_ratio', label: 'Volumen Ratio' },
]
const CONDICIONES = [
  { value: 'above', label: 'supera' },
  { value: 'below', label: 'cae debajo de' },
]

export default function Alertas() {
  const [alertas, setAlertas] = useState([])
  const [disparadas, setDisparadas] = useState([])
  const [form, setForm] = useState({ ticker: '', tipo: 'price', condicion: 'above', valor: '' })
  const [evaluando, setEvaluando] = useState(false)

  const load = async () => {
    const d = await api.alertas()
    setAlertas(d.alertas || [])
    setDisparadas(d.disparadas || [])
  }

  useEffect(() => { load() }, [])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const agregar = async () => {
    if (!form.ticker || !form.valor) return
    await api.crearAlerta({
      ticker: form.ticker.toUpperCase(),
      tipo: form.tipo,
      condicion: form.condicion,
      valor: parseFloat(form.valor),
    })
    setForm({ ticker: '', tipo: 'price', condicion: 'above', valor: '' })
    load()
  }

  const eliminar = async (id) => {
    await api.eliminarAlerta(id)
    load()
  }

  const evaluar = async () => {
    setEvaluando(true)
    await api.evaluarAlertas()
    await load()
    setEvaluando(false)
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h2 style={s.title}>Alertas de Mercado</h2>
        <button onClick={evaluar} disabled={evaluando} style={s.evalBtn}>
          {evaluando ? 'Evaluando...' : '⚡ Evaluar ahora'}
        </button>
      </div>
      <p style={s.hint}>Las alertas se evalúan automáticamente con cada ejecución del screener.</p>

      {/* Form */}
      <div style={s.formCard}>
        <h3 style={s.formTitle}>Nueva alerta</h3>
        <div style={s.formRow}>
          <input
            placeholder="Ticker (ej: GGAL)"
            value={form.ticker}
            onChange={e => setF('ticker', e.target.value.toUpperCase())}
            style={s.input}
          />
          <select value={form.tipo} onChange={e => setF('tipo', e.target.value)} style={s.select}>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={form.condicion} onChange={e => setF('condicion', e.target.value)} style={s.select}>
            {CONDICIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input
            type="number"
            placeholder="Valor"
            value={form.valor}
            onChange={e => setF('valor', e.target.value)}
            style={{ ...s.input, width: 120 }}
          />
          <button onClick={agregar} style={s.addBtn}>+ Agregar</button>
        </div>
      </div>

      {/* Active alerts */}
      {alertas.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Alertas activas ({alertas.length})</h3>
          <div style={s.chipList}>
            {alertas.map(a => (
              <div key={a.id} style={{ ...s.chip, borderColor: a.triggered ? 'var(--green)' : 'var(--border2)' }}>
                <span style={s.chipTicker}>{a.ticker}</span>
                <span style={s.chipText}>
                  {TIPOS.find(t => t.value === a.tipo)?.label} {CONDICIONES.find(c => c.value === a.condicion)?.label} {a.valor}
                </span>
                {a.triggered && <span style={s.triggered}>✓</span>}
                <button onClick={() => eliminar(a.id)} style={s.removeBtn}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Triggered */}
      {disparadas.length > 0 && (
        <div style={s.section}>
          <h3 style={{ ...s.sectionTitle, color: 'var(--green)' }}>🔔 Alertas disparadas ({disparadas.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {disparadas.map((a, i) => (
              <div key={i} style={s.triggeredCard}>
                <div style={s.trigIcon}>🔔</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={s.chipTicker}>{a.ticker}</span>
                    <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 11 }}>{a.signal}</span>
                  </div>
                  <p style={s.trigDetail}>
                    {TIPOS.find(t => t.value === a.tipo)?.label} {CONDICIONES.find(c => c.value === a.condicion)?.label} {a.valor}
                    {' → '}<strong style={{ color: 'var(--green)' }}>{a.valor_actual}</strong>
                  </p>
                </div>
                <span style={s.trigTime}>{a.timestamp ? new Date(a.timestamp).toLocaleTimeString('es-AR') : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertas.length === 0 && (
        <div style={s.empty}>
          <div style={{ fontSize: 40 }}>🔔</div>
          <p style={{ color: 'var(--text3)', marginTop: 12 }}>No hay alertas configuradas.</p>
          <p style={{ color: 'var(--text3)', fontSize: 12 }}>Usá el formulario de arriba para crear alertas de precio o RSI.</p>
        </div>
      )}
    </div>
  )
}

const s = {
  root: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--text)' },
  hint: { color: 'var(--text3)', fontSize: 12, marginTop: -12 },
  evalBtn: { background: 'var(--bg3)', border: '1px solid var(--accent)', color: 'var(--accent2)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  formCard: { background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' },
  formTitle: { color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginBottom: 12 },
  formRow: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  input: { background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 12px', borderRadius: 6, fontSize: 13, width: 160, outline: 'none' },
  select: { background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '7px 10px', borderRadius: 6, fontSize: 13 },
  addBtn: { background: 'linear-gradient(135deg, var(--accent), #5a4fcf)', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600 },
  section: {},
  sectionTitle: { color: 'var(--text2)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  chipList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg1)', border: '1px solid', borderRadius: 20 },
  chipTicker: { color: 'var(--text)', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 13 },
  chipText: { color: 'var(--text3)', fontSize: 12 },
  triggered: { color: 'var(--green)', fontSize: 12, fontWeight: 700 },
  removeBtn: { background: 'none', border: 'none', color: 'var(--text3)', fontSize: 14, padding: 0 },
  triggeredCard: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#001f0f', border: '1px solid var(--green)', borderRadius: 10 },
  trigIcon: { fontSize: 22 },
  trigDetail: { color: 'var(--text3)', fontSize: 12, margin: '2px 0 0' },
  trigTime: { color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--mono)', flexShrink: 0 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', textAlign: 'center' },
}
