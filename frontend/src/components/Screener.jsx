import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import { SignalChip, ScoreDisplay, RsiPill, Pct, Price, ReasonTags, getScoreClass } from './shared'

const GROUPS   = [['','Todos'],['merval','Merval'],['panel','Panel Gral.'],['cedears','CEDEARs']]
const SIGNALS  = ['','COMPRA FUERTE','COMPRA','ALCISTA','NEUTRO','BAJISTA','VENTA','VENTA FUERTE']
const COLUMNS  = [
  { key:'ticker',       label:'TICKER',       sortable:false },
  { key:'price',        label:'PRECIO',       sortable:true  },
  { key:'var_dia',      label:'VAR%',         sortable:true  },
  { key:'rsi',          label:'RSI 14',       sortable:true  },
  { key:'sma20',        label:'SMA 20',       sortable:false },
  { key:'sma50',        label:'SMA 50',       sortable:false },
  { key:'vol_ratio',    label:'VOL RATIO',    sortable:true  },
  { key:'dist_min_52w', label:'DIST MÍN 52W', sortable:true  },
  { key:'score',        label:'SCORE',        sortable:true  },
  { key:'signal',       label:'SEÑAL',        sortable:false },
  { key:'reasons',      label:'ANÁLISIS',     sortable:false },
]

function applySort(items, sortBy, order) {
  return [...items].sort((a,b) => {
    const va = a[sortBy] ?? (order==='desc' ? -Infinity : Infinity)
    const vb = b[sortBy] ?? (order==='desc' ? -Infinity : Infinity)
    const primary = order==='desc' ? vb-va : va-vb
    if (primary !== 0) return primary
    if (sortBy==='score') return (a.rsi??50) - (b.rsi??50)
    return 0
  })
}

const labelS = { display:'block', fontFamily:'var(--cond)', fontSize:9, color:'var(--text3)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }

function TableRow({ r }) {
  const [hover, setHover] = useState(false)
  return (
    <tr className={getScoreClass(r.score)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderBottom:'1px solid var(--border)', transition:'background .12s',
        background:hover?'var(--bg3)':'transparent' }}>
      <td style={td.ticker}>
        <div>{r.ticker}</div>
        <div style={{ fontFamily:'var(--cond)', fontSize:9, color:'var(--text3)', letterSpacing:1, textTransform:'uppercase' }}>{r.grupo}</div>
      </td>
      <td style={td.n}><Price v={r.price} /></td>
      <td style={td.n}><Pct v={r.var_dia} /></td>
      <td style={td.n}><RsiPill v={r.rsi} /></td>
      <td style={td.n}><Price v={r.sma20} /></td>
      <td style={td.n}><Price v={r.sma50} /></td>
      <td style={td.n}>
        {r.vol_ratio!=null
          ? <span style={{ fontFamily:'var(--mono)', fontSize:12, color:r.vol_ratio>=2?'var(--orange)':'var(--text3)' }}>{r.vol_ratio.toFixed(1)}x</span>
          : <span style={{ color:'var(--text3)' }}>—</span>}
      </td>
      <td style={td.n}>
        {r.dist_min_52w!=null
          ? <span style={{ fontFamily:'var(--mono)', fontSize:12, color:r.dist_min_52w<=5?'var(--yellow)':'var(--text3)' }}>+{r.dist_min_52w.toFixed(1)}%</span>
          : <span style={{ color:'var(--text3)' }}>—</span>}
      </td>
      <td style={td.n}><ScoreDisplay score={r.score} /></td>
      <td style={td.n}><SignalChip signal={r.signal} size="small" /></td>
      <td style={{ ...td.n, minWidth:180 }}><ReasonTags reasons={r.reasons} /></td>
    </tr>
  )
}

function MobileCard({ r }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={getScoreClass(r.score)} onClick={() => setOpen(o=>!o)}
      style={{ background:'var(--bg2)', borderRadius:'var(--radius-sm)', marginBottom:4,
        padding:'10px 12px', borderLeft:'2px solid var(--border)', cursor:'pointer' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontFamily:'var(--mono)', fontWeight:500, fontSize:14, color:'var(--text)', minWidth:55 }}>{r.ticker}</span>
        <Price v={r.price} size={13} />
        <Pct v={r.var_dia} size={12} />
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
          <ScoreDisplay score={r.score} />
          <SignalChip signal={r.signal} size="small" />
        </div>
      </div>
      {open && (
        <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div><span style={labelS}>RSI 14</span><RsiPill v={r.rsi} /></div>
          <div><span style={labelS}>SMA 20</span><Price v={r.sma20} /></div>
          <div><span style={labelS}>SMA 50</span><Price v={r.sma50} /></div>
          <div><span style={labelS}>Vol Ratio</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:12, color:(r.vol_ratio||0)>=2?'var(--orange)':'var(--text2)' }}>
              {r.vol_ratio?.toFixed(1)??'—'}x
            </span>
          </div>
          <div style={{ gridColumn:'1/-1' }}><ReasonTags reasons={r.reasons} /></div>
        </div>
      )}
    </div>
  )
}

// Toggle para ocultar tickers sin datos de análisis
function OnlyWithData({ value, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none' }}>
      <div onClick={() => onChange(!value)} style={{
        width:28, height:16, borderRadius:8, position:'relative', transition:'background .2s',
        background: value ? 'var(--green2)' : 'var(--bg3)',
        border: '1px solid ' + (value ? 'var(--green)' : 'var(--border2)'),
      }}>
        <div style={{
          position:'absolute', top:2, left: value ? 13 : 2,
          width:10, height:10, borderRadius:'50%',
          background: value ? 'var(--green)' : 'var(--text3)',
          transition:'left .2s',
        }} />
      </div>
      <span style={{ fontFamily:'var(--cond)', fontSize:12, color:'var(--text3)', letterSpacing:.3 }}>Solo con análisis</span>
    </label>
  )
}

export default function Screener({ refreshKey }) {
  const [results,      setResults]      = useState([])
  const [count,        setCount]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [grupo,        setGrupo]        = useState('')
  const [signal,       setSignal]       = useState('')
  const [sortBy,       setSortBy]       = useState('score')
  const [order,        setOrder]        = useState('desc')
  const [search,       setSearch]       = useState('')
  const [onlyData,     setOnlyData]     = useState(false)
  const [lastRun,      setLastRun]      = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.screener({ grupo, signal, sort_by:sortBy, order })
      setResults(d.data||[])
      setCount(d.count||0)
      setLastRun(d.last_run)
    } catch {}
    setLoading(false)
  }, [grupo, signal, sortBy, order])

  useEffect(() => { load() }, [load, refreshKey])

  // Sort en el frontend para no re-fetchear al cambiar orden
  const handleColSort = (key) => {
    if (!COLUMNS.find(c=>c.key===key)?.sortable) return
    if (sortBy===key) setOrder(o => o==='desc'?'asc':'desc')
    else { setSortBy(key); setOrder('desc') }
  }

  let filtered = results
  if (search)   filtered = filtered.filter(r => r.ticker.toLowerCase().includes(search.toLowerCase()))
  if (onlyData) filtered = filtered.filter(r => r.rsi!=null && r.sma20!=null)
  filtered = applySort(filtered, sortBy, order)

  return (
    <div style={s.root}>
      <div style={s.controls}>
        <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={s.searchInput} />
        <div style={s.btnGroup}>
          {GROUPS.map(([id,label]) => (
            <button key={id} onClick={() => setGrupo(id)} style={grupo===id?{...s.btn,...s.btnOn}:s.btn}>{label}</button>
          ))}
        </div>
        <select value={signal} onChange={e=>setSignal(e.target.value)} style={s.select}>
          <option value="">Todas las señales</option>
          {SIGNALS.filter(Boolean).map(sig => <option key={sig} value={sig}>{sig}</option>)}
        </select>
        <OnlyWithData value={onlyData} onChange={setOnlyData} />
        <span style={s.count}>{filtered.length} activos</span>
      </div>

      {loading ? (
        <div style={s.loadingWrap}>
          <div style={s.spinner} />
          <span style={{ color:'var(--text3)', fontSize:12, marginTop:10 }}>Cargando...</span>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div style={s.tableWrap} className="hide-mobile">
            <table style={s.table}>
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key}
                      onClick={() => handleColSort(col.key)}
                      style={{
                        ...s.th,
                        cursor: col.sortable ? 'pointer' : 'default',
                        color: sortBy===col.key ? 'var(--green)' : 'var(--text3)',
                        userSelect:'none',
                      }}>
                      {col.label}
                      {col.sortable && sortBy===col.key && (
                        <span style={{ marginLeft:4, fontSize:10 }}>{order==='desc'?'↓':'↑'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => <TableRow key={r.ticker} r={r} />)}
              </tbody>
            </table>
            {filtered.length===0 && <p style={s.empty}>Sin resultados.</p>}
          </div>

          {/* Mobile cards */}
          <div className="show-mobile">
            {filtered.length===0
              ? <p style={s.empty}>Sin resultados.</p>
              : filtered.map(r => <MobileCard key={r.ticker} r={r} />)
            }
          </div>
        </>
      )}

      {lastRun && <p style={s.footer}>Último scan: {new Date(lastRun).toLocaleString('es-AR')} · {count} tickers</p>}
    </div>
  )
}

const s = {
  root: { display:'flex', flexDirection:'column', gap:12 },
  controls: { display:'flex', flexWrap:'wrap', gap:6, alignItems:'center',
    padding:'10px 14px', background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:'var(--radius)' },
  searchInput: { background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text)',
    padding:'5px 10px', borderRadius:'var(--radius-sm)', fontSize:13, width:130, outline:'none' },
  btnGroup: { display:'flex', gap:2 },
  btn: { background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text3)',
    padding:'4px 10px', borderRadius:'var(--radius-sm)', fontSize:12,
    fontFamily:'var(--cond)', fontWeight:500, letterSpacing:.5 },
  btnOn: { background:'var(--bg4)', border:'1px solid var(--green)', color:'var(--green)' },
  select: { background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text2)',
    padding:'4px 8px', borderRadius:'var(--radius-sm)', fontSize:12 },
  count: { marginLeft:'auto', color:'var(--text3)', fontFamily:'var(--mono)', fontSize:11 },
  tableWrap: { overflowX:'auto', background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:'var(--radius)' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th: { padding:'8px 12px', textAlign:'left', fontSize:9, fontWeight:600,
    fontFamily:'var(--cond)', textTransform:'uppercase', letterSpacing:1.5,
    background:'var(--bg)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap',
    transition:'color .15s' },
  empty: { padding:32, color:'var(--text3)', textAlign:'center', fontSize:13 },
  footer: { color:'var(--text3)', fontSize:11, fontFamily:'var(--mono)', textAlign:'right' },
  loadingWrap: { display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 0' },
  spinner: { width:28, height:28, border:'2px solid var(--border2)', borderTop:'2px solid var(--green)', borderRadius:'50%', animation:'spin .7s linear infinite' },
}
const td = {
  ticker: { padding:'8px 12px', color:'var(--text)', fontFamily:'var(--mono)', fontWeight:500, fontSize:13 },
  n:      { padding:'8px 12px', color:'var(--text2)' },
}
