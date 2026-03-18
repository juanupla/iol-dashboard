"""
Scheduler — corre el screener cada 15 minutos entre 11:00 y 17:00 Buenos Aires.
Guarda resultados en cache compartido con FastAPI.

Estrategia simple y robusta:
- Cada ticker se pide individualmente con get_cotizacion + get_historico.
- No hay prefetch en bloque (la API v2 de IOL no lo soporta para todos los paneles).
- Rate limit: 0.25s entre requests.
"""
import logging
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from iol_client import iol
from screener import analizar_ticker, ALL_TICKERS

logger = logging.getLogger(__name__)
BA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

# ── Cache compartido ──────────────────────────────────────────────────────────
cache = {
    "screener": {},
    "last_run":  None,
    "running":   False,
    "progress":  0,
    "total":     0,
    "errors":    [],
}

# ── Lógica principal ──────────────────────────────────────────────────────────

async def run_screener():
    if cache["running"]:
        logger.info("Screener ya en ejecución, skip.")
        return

    now_ba = datetime.now(BA_TZ)
    logger.info(f"[{now_ba.strftime('%H:%M:%S')}] Iniciando screener...")

    cache["running"]  = True
    cache["last_run"] = now_ba.isoformat()
    cache["errors"]   = []

    total = sum(len(v) for v in ALL_TICKERS.values())
    cache["total"]    = total
    cache["progress"] = 0

    loop = asyncio.get_event_loop()

    for grupo, tickers in ALL_TICKERS.items():
        logger.info(f"Procesando grupo {grupo} ({len(tickers)} tickers)...")
        for ticker in tickers:
            try:
                result = await loop.run_in_executor(
                    None, analizar_ticker, iol, ticker, "BCBA"
                )
                result["grupo"] = grupo
                cache["screener"][ticker] = result
                if result.get("error"):
                    logger.warning(f"  {ticker}: {result['error']}")
            except Exception as e:
                logger.error(f"  {ticker} excepción: {e}")
                cache["errors"].append(f"{ticker}: {e}")

            cache["progress"] += 1
            await asyncio.sleep(0.25)

    cache["running"] = False
    ok  = sum(1 for r in cache["screener"].values() if not r.get("error"))
    err = sum(1 for r in cache["screener"].values() if r.get("error"))
    logger.info(f"Screener completo — {ok} OK, {err} con error, de {total} tickers")

def ping_self():
    """Evita que Render duerma el servicio durante horario de mercado."""
    import os, requests as req
    url = os.environ.get("SELF_URL", "")
    if url:
        try:
            req.get(f"{url}/health", timeout=10)
        except Exception:
            pass

# ── Setup del scheduler ───────────────────────────────────────────────────────

def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=BA_TZ)

    scheduler.add_job(
        run_screener,
        CronTrigger(
            day_of_week="mon-fri",
            hour="11-16",
            minute="0,15,30,45",
            timezone=BA_TZ,
        ),
        id="screener",
        name="IOL Screener",
        max_instances=1,
        coalesce=True,
    )

    scheduler.add_job(
        ping_self,
        CronTrigger(
            day_of_week="mon-fri",
            hour="11-17",
            minute="*/14",
            timezone=BA_TZ,
        ),
        id="ping",
        name="Anti-sleep ping",
    )

    # Run inmediato al arrancar
    scheduler.add_job(
        run_screener,
        "date",
        run_date=datetime.now(BA_TZ),
        id="screener_boot",
        name="Screener inicial",
    )

    return scheduler
