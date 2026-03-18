"""
Scheduler — corre el screener cada 15 minutos entre 11:00 y 17:00 Buenos Aires.
Guarda los resultados en memoria (cache compartido con FastAPI).
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
    "screener": {},          # {ticker: resultado}
    "last_run": None,
    "next_run": None,
    "running": False,
    "progress": 0,
    "total": 0,
    "errors": [],
}

# ── Lógica principal ──────────────────────────────────────────────────────────

async def run_screener():
    if cache["running"]:
        logger.info("Screener ya está corriendo, skip.")
        return

    now_ba = datetime.now(BA_TZ)
    logger.info(f"[{now_ba.strftime('%H:%M:%S')}] Iniciando screener...")

    cache["running"] = True
    cache["last_run"] = now_ba.isoformat()
    cache["errors"] = []

    # Construir lista completa de tickers con su mercado
    tasks = []
    for grupo, tickers in ALL_TICKERS.items():
        mercado = "BCBA"
        for t in tickers:
            tasks.append((t, mercado, grupo))

    cache["total"] = len(tasks)
    cache["progress"] = 0

    for ticker, mercado, grupo in tasks:
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, analizar_ticker, iol, ticker, mercado
            )
            result["grupo"] = grupo
            cache["screener"][ticker] = result
        except Exception as e:
            cache["errors"].append(f"{ticker}: {e}")
        cache["progress"] += 1
        await asyncio.sleep(0.3)  # Rate limiting gentil con IOL

    cache["running"] = False
    logger.info(f"Screener completo: {len(cache['screener'])} tickers procesados, {len(cache['errors'])} errores.")

def ping_self():
    """Evita que Render duerma el servicio durante horario de mercado."""
    import os, requests
    url = os.environ.get("SELF_URL", "")
    if url:
        try:
            requests.get(f"{url}/health", timeout=10)
        except Exception:
            pass

# ── Setup del scheduler ───────────────────────────────────────────────────────

def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=BA_TZ)

    # Screener cada 15 min, lunes a viernes, 11:00-17:00
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

    # Ping anti-sleep cada 14 min durante horario de mercado
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

    # Run inmediato al arrancar (para tener datos de inmediato)
    scheduler.add_job(
        run_screener,
        "date",
        run_date=datetime.now(BA_TZ),
        id="screener_boot",
        name="Screener inicial",
    )

    return scheduler
