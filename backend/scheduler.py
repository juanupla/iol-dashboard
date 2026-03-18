"""
Scheduler — corre el screener cada 15 minutos entre 11:00 y 17:00 Buenos Aires.
Guarda resultados en cache compartido con FastAPI.

Estrategia de llamadas a IOL:
  1. Para cada grupo, intenta obtener el panel completo en un solo GET
     (reduce N llamadas a 1 por grupo para cotizaciones).
  2. Luego pide histórico ticker por ticker (necesario para RSI/SMAs).
"""
import logging
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from iol_client import iol
from screener import analizar_ticker, ALL_TICKERS, IOL_PANEL_NAME

logger = logging.getLogger(__name__)
BA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

# ── Cache compartido ──────────────────────────────────────────────────────────
cache = {
    "screener": {},
    "last_run":  None,
    "next_run":  None,
    "running":   False,
    "progress":  0,
    "total":     0,
    "errors":    [],
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_panel_cotizaciones(grupo: str) -> dict:
    """
    Intenta traer todas las cotizaciones del panel de un grupo en un solo request.
    Devuelve dict {ticker: cot_data}. Si falla, devuelve {}.
    """
    try:
        panel_name = IOL_PANEL_NAME.get(grupo, "acciones")
        data = iol.get_panel(panel_name, "BCBA")
        result = {}
        # La respuesta es una lista de objetos con titulo.simbolo
        if isinstance(data, list):
            for item in data:
                simbolo = (
                    item.get("simbolo") or
                    (item.get("titulo") or {}).get("simbolo") or
                    item.get("ticker")
                )
                if simbolo:
                    result[simbolo.upper()] = item
        return result
    except Exception as e:
        logger.warning(f"No se pudo obtener panel {grupo}: {e}")
        return {}

# ── Lógica principal ──────────────────────────────────────────────────────────

async def run_screener():
    if cache["running"]:
        logger.info("Screener ya en ejecución, skip.")
        return

    now_ba = datetime.now(BA_TZ)
    logger.info(f"[{now_ba.strftime('%H:%M:%S')}] Iniciando screener completo...")

    cache["running"] = True
    cache["last_run"] = now_ba.isoformat()
    cache["errors"]   = []

    total = sum(len(v) for v in ALL_TICKERS.values())
    cache["total"]    = total
    cache["progress"] = 0

    loop = asyncio.get_event_loop()

    for grupo, tickers in ALL_TICKERS.items():
        # Paso 1: obtener cotizaciones del panel en bloque (1 request por grupo)
        logger.info(f"Obteniendo panel {grupo} ({len(tickers)} tickers)...")
        panel_cots = await loop.run_in_executor(None, fetch_panel_cotizaciones, grupo)
        logger.info(f"Panel {grupo}: {len(panel_cots)} cotizaciones obtenidas")

        # Paso 2: analizar cada ticker (histórico individual)
        for ticker in tickers:
            try:
                cot_pre = panel_cots.get(ticker)  # None si no vino en el panel
                result = await loop.run_in_executor(
                    None, analizar_ticker, iol, ticker, "BCBA", cot_pre
                )
                result["grupo"] = grupo
                cache["screener"][ticker] = result
            except Exception as e:
                logger.error(f"Error {ticker}: {e}")
                cache["errors"].append(f"{ticker}: {e}")

            cache["progress"] += 1
            await asyncio.sleep(0.25)  # gentil con IOL

    cache["running"] = False
    ok  = sum(1 for r in cache["screener"].values() if not r.get("error"))
    err = len(cache["errors"])
    logger.info(f"Screener completo — {ok} OK, {err} errores de {total} tickers")

def ping_self():
    """Evita que Render duerma el servicio durante horario de mercado."""
    import os, requests as req
    url = os.environ.get("SELF_URL", "")
    if url:
        try:
            req.get(f"{url}/health", timeout=10)
            logger.debug("Ping anti-sleep OK")
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

    # Run inmediato al arrancar
    scheduler.add_job(
        run_screener,
        "date",
        run_date=datetime.now(BA_TZ),
        id="screener_boot",
        name="Screener inicial",
    )

    return scheduler
