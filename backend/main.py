"""
IOL Dashboard — Backend FastAPI
Endpoints: /screener, /portafolio, /alertas, /status, /health
"""
import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from iol_client import iol
from screener import ALL_TICKERS
from scheduler import create_scheduler, cache, run_screener

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── App lifecycle ─────────────────────────────────────────────────────────────

scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global scheduler
    logger.info("Arrancando IOL Dashboard backend...")
    scheduler = create_scheduler()
    scheduler.start()
    yield
    logger.info("Cerrando backend...")
    if scheduler:
        scheduler.shutdown(wait=False)

app = FastAPI(
    title="IOL Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Modelos ───────────────────────────────────────────────────────────────────

class AlertaCreate(BaseModel):
    ticker: str
    tipo: str          # "price" | "rsi" | "vol_ratio"
    condicion: str     # "above" | "below"
    valor: float
    activa: bool = True

# Storage en memoria para alertas (podría ser SQLite en v2)
alertas_store: list[dict] = []
alertas_disparadas: list[dict] = []

# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}

# ── Status del screener ───────────────────────────────────────────────────────

@app.get("/api/status")
def status():
    return {
        "running": cache["running"],
        "last_run": cache["last_run"],
        "progress": cache["progress"],
        "total": cache["total"],
        "tickers_cached": len(cache["screener"]),
        "errors_count": len(cache["errors"]),
        "scheduler_running": scheduler.running if scheduler else False,
    }

# ── Screener ──────────────────────────────────────────────────────────────────

@app.get("/api/screener")
def get_screener(
    grupo: Optional[str] = Query(None, description="merval | panel | cedears"),
    signal: Optional[str] = Query(None, description="COMPRA FUERTE | COMPRA | NEUTRO | etc"),
    min_score: Optional[int] = Query(None),
    sort_by: Optional[str] = Query("score", description="score | rsi | var_dia | vol_ratio"),
    order: Optional[str] = Query("desc"),
    limit: Optional[int] = Query(None),
):
    results = list(cache["screener"].values())

    # Filtros
    if grupo:
        results = [r for r in results if r.get("grupo") == grupo]
    if signal:
        results = [r for r in results if r.get("signal") == signal.upper()]
    if min_score is not None:
        results = [r for r in results if (r.get("score") or 0) >= min_score]

    # Excluir errores
    results = [r for r in results if not r.get("error")]

    # Sort
    reverse = order == "desc"
    def sort_key(r):
        v = r.get(sort_by)
        if v is None:
            return -999 if reverse else 999
        return v

    results.sort(key=sort_key, reverse=reverse)

    if limit:
        results = results[:limit]

    return {
        "count": len(results),
        "last_run": cache["last_run"],
        "data": results,
    }

@app.get("/api/screener/oportunidades")
def get_oportunidades():
    """Top oportunidades de compra y venta del momento."""
    all_data = [r for r in cache["screener"].values() if not r.get("error") and r.get("score") is not None]

    compras = sorted(
        [r for r in all_data if r.get("score", 0) >= 2],
        key=lambda x: x["score"], reverse=True
    )[:10]

    ventas = sorted(
        [r for r in all_data if r.get("score", 0) <= -2],
        key=lambda x: x["score"]
    )[:10]

    cerca_min = sorted(
        [r for r in all_data if r.get("dist_min_52w") is not None and r["dist_min_52w"] <= 10],
        key=lambda x: x["dist_min_52w"]
    )[:10]

    volumen_anomalo = sorted(
        [r for r in all_data if r.get("vol_ratio") and r["vol_ratio"] >= 2.0],
        key=lambda x: x["vol_ratio"], reverse=True
    )[:10]

    return {
        "top_compras": compras,
        "top_ventas": ventas,
        "cerca_minimo_52w": cerca_min,
        "volumen_anomalo": volumen_anomalo,
        "last_run": cache["last_run"],
    }

@app.post("/api/screener/refresh")
async def trigger_screener():
    """Dispara un scan manual."""
    if cache["running"]:
        return {"message": "Ya está corriendo", "running": True}
    import asyncio
    asyncio.create_task(run_screener())
    return {"message": "Screener iniciado", "running": True}

# ── Portafolio ────────────────────────────────────────────────────────────────

@app.get("/api/portafolio")
def get_portafolio():
    try:
        data = iol.get_portafolio("argentina")

        # Enriquecer con señales del screener
        activos = data.get("activos", [])
        for activo in activos:
            ticker = activo.get("titulo", {}).get("simbolo")
            if ticker and ticker in cache["screener"]:
                sc = cache["screener"][ticker]
                activo["screener"] = {
                    "signal": sc.get("signal"),
                    "score": sc.get("score"),
                    "rsi": sc.get("rsi"),
                    "reasons": sc.get("reasons", []),
                }

        return {"data": data, "activos_count": len(activos)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/estado-cuenta")
def get_estado_cuenta():
    try:
        return iol.get_estado_cuenta()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/operaciones")
def get_operaciones():
    try:
        return iol.get_operaciones()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Alertas ───────────────────────────────────────────────────────────────────

@app.get("/api/alertas")
def get_alertas():
    return {
        "alertas": alertas_store,
        "disparadas": alertas_disparadas,
    }

@app.post("/api/alertas")
def crear_alerta(alerta: AlertaCreate):
    nueva = alerta.model_dump()
    nueva["id"] = len(alertas_store) + 1
    nueva["ticker"] = nueva["ticker"].upper()
    nueva["triggered"] = False
    alertas_store.append(nueva)
    return nueva

@app.delete("/api/alertas/{alerta_id}")
def eliminar_alerta(alerta_id: int):
    global alertas_store
    alertas_store = [a for a in alertas_store if a["id"] != alerta_id]
    return {"ok": True}

@app.post("/api/alertas/evaluar")
def evaluar_alertas():
    """Evalúa todas las alertas activas contra el cache del screener."""
    global alertas_disparadas
    disparadas = []

    for alerta in alertas_store:
        if not alerta.get("activa"):
            continue
        ticker = alerta["ticker"]
        data = cache["screener"].get(ticker)
        if not data or data.get("error"):
            continue

        campo_map = {
            "price": data.get("price"),
            "rsi": data.get("rsi"),
            "vol_ratio": data.get("vol_ratio"),
        }
        valor_actual = campo_map.get(alerta["tipo"])
        if valor_actual is None:
            continue

        condicion = alerta["condicion"]
        umbral = alerta["valor"]

        disparada = (
            (condicion == "above" and valor_actual >= umbral) or
            (condicion == "below" and valor_actual <= umbral)
        )

        if disparada:
            alerta["triggered"] = True
            entry = {
                **alerta,
                "valor_actual": valor_actual,
                "signal": data.get("signal"),
                "timestamp": cache["last_run"],
            }
            disparadas.append(entry)

    alertas_disparadas = disparadas
    return {"disparadas": disparadas, "count": len(disparadas)}

# ── Cotización individual ─────────────────────────────────────────────────────

@app.get("/api/cotizacion/{ticker}")
def get_cotizacion(ticker: str, mercado: str = "BCBA"):
    cached = cache["screener"].get(ticker.upper())
    if cached:
        return cached
    try:
        return iol.get_cotizacion(ticker.upper(), mercado)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
