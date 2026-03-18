"""
Motor de análisis técnico.
Calcula RSI, SMAs, volumen anómalo, distancia 52w y genera señales de oportunidad.
"""
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Tickers ───────────────────────────────────────────────────────────────────

MERVAL_TICKERS = [
    "GGAL","YPFD","BMA","PAMP","TXAR","ALUA","CRES","SUPV","COME","TECO2",
    "MIRG","BYMA","CVH","EDN","TRAN","VALO","HARG","LOMA","MOLI","CEPU",
    "CGPA2","IRSA","AGRO","BOLT","BHIP","RICH","FERR","GARO","SEMI","ROSE",
]

PANEL_GENERAL_LIQUIDOS = [
    "BBAR","CABK","CAPX","CARC","CTIO","DGCU2","DICA","DYCA","GCDI","GCLA",
    "GRIM","HAVA","INTR","INVJ","LEDE","LONG","METR","MOLA","MPAL","MTR",
    "OEST","PATA","PGR","POLL","RIGO","SAMI","SANO","TGNO4","TGSU2",
]

# Tickers verificados que cotizan como CEDEARs en BCBA
# Removidos: MS, BLK, RCL (no disponibles), DIS→DISN, AXP→AXP (verificar)
CEDEAR_TICKERS = [
    "AAL","AAP","AAPL","ABBV","ABEV","ABNB","ABT","ACN","ACWI","ADBE","ADGO","ADI",
    "ADP","ADS","AEG","AEM","AI","AIG","AKO.B","ALAB","AMAT","AMD","AMGN","AMX",
    "AMZN","ANF","ARCO","ARKK","ARM","ASML","ASR","ASTS","AVGO","AVY","AXIA","AXP",
    "AZN","B","BA","BA.C","BABA","BAK","BB","BBAS3","BBD","BBV","BCS","BHP",
    "BIDU","BIIB","BIOX","BITF","BK","BKNG","BKR","BMY","BNG","BP","BRKB","BSBR",
    "C","CAAP","CAH","CAR","CAT","CCL","CDE","CEG","CL","COIN","COPX","COST",
    "CRM","CRWV","CSCO","CSNA3","CVS","CVX","CX","DAL","DD","DE","DEO","DESP",
    "DHR","DIA","DISN","DOCU","DOW","E","EA","EBAY","EEM","EFX","ELPC","EMBJ",
    "EQNR","ERIC","ETHA","F","FMX","FSLR","GE","GILD","GLD","GLOB","GM","GOLD",
    "GOOGL","GS","HAL","HD","HOG","HPQ","HSBC","HUT","IBIT","IBM","ILF","INFY",
    "INTC","ITA","ITUB","JNJ","JPM","KGC","KO","LLY","LMT","LND","LRCX","MA",
    "MAR","MCD","MELI","META","MGLU3","MMM","MO","MRK","MSFT","MU","NEM","NFLX",
    "NKE","NOW","NU","NVDA","ORCL","PAGS","PANW","PATH","PBR","PEP","PFE","PM",
    "PYPL","QCOM","QQQ","RIOT","RTX","SATL","SBUX","SCCO","SH","SLV","SMH","SNAP",
    "SNOW","SONY","SPY","STLA","SYY","T","TGT","TM","TSLA","TSM","TWLO","UAL",
    "UBER","UPST","V","VALE","VIG","VIST","WEGE3","WFC","WMT","XLC","XLV","XOM",
    "ZM",
]

ALL_TICKERS = {
    "merval": MERVAL_TICKERS,
    "panel":  PANEL_GENERAL_LIQUIDOS,
    "cedears": CEDEAR_TICKERS,
}

# ── Cálculos técnicos ─────────────────────────────────────────────────────────

def calc_rsi(closes: list, period: int = 14) -> Optional[float]:
    if len(closes) < period + 1:
        return None
    gains, losses = 0.0, 0.0
    for i in range(1, period + 1):
        diff = closes[i] - closes[i - 1]
        if diff >= 0: gains += diff
        else: losses -= diff
    avg_gain = gains / period
    avg_loss = losses / period
    for i in range(period + 1, len(closes)):
        diff = closes[i] - closes[i - 1]
        g = diff if diff >= 0 else 0
        l = -diff if diff < 0 else 0
        avg_gain = (avg_gain * (period - 1) + g) / period
        avg_loss = (avg_loss * (period - 1) + l) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - 100 / (1 + rs), 2)

def calc_sma(closes: list, period: int) -> Optional[float]:
    if len(closes) < period:
        return None
    return round(sum(closes[-period:]) / period, 2)

def calc_volume_ratio(volumes: list, period: int = 20) -> Optional[float]:
    if len(volumes) < period + 1:
        return None
    avg = sum(volumes[-period-1:-1]) / period
    if avg == 0:
        return None
    return round(volumes[-1] / avg, 2)

def calc_dist_52w(price: float, max52: Optional[float], min52: Optional[float]) -> dict:
    result = {"dist_max_52w": None, "dist_min_52w": None}
    if max52 and max52 > 0:
        result["dist_max_52w"] = round((price - max52) / max52 * 100, 2)
    if min52 and min52 > 0:
        result["dist_min_52w"] = round((price - min52) / min52 * 100, 2)
    return result

def detect_signal(rsi, sma20, sma50, sma200, price, vol_ratio, dist_min_52w, dist_max_52w):
    score = 0
    reasons = []

    if rsi is not None:
        if rsi <= 25:
            score += 3
            reasons.append({"texto": f"RSI extremo: {rsi}", "tipo": "positivo"})
        elif rsi <= 30:
            score += 2
            reasons.append({"texto": f"RSI sobrevendido: {rsi}", "tipo": "positivo"})
        elif rsi <= 40:
            score += 1
            reasons.append({"texto": f"RSI bajo: {rsi}", "tipo": "leve_positivo"})
        elif rsi >= 75:
            score -= 3
            reasons.append({"texto": f"RSI extremo: {rsi}", "tipo": "negativo"})
        elif rsi >= 70:
            score -= 2
            reasons.append({"texto": f"RSI sobrecomprado: {rsi}", "tipo": "negativo"})

    if sma20 and sma50:
        if sma20 > sma50:
            score += 1
            reasons.append({"texto": "SMA20 > SMA50", "tipo": "positivo"})
        else:
            score -= 1
            reasons.append({"texto": "SMA20 < SMA50", "tipo": "negativo"})

    if price and sma20:
        if price > sma20:
            score += 1
            reasons.append({"texto": "Precio sobre SMA20", "tipo": "positivo"})
        else:
            score -= 1
            reasons.append({"texto": "Precio bajo SMA20", "tipo": "negativo"})

    if sma50 and sma200:
        if sma50 > sma200:
            score += 1
            reasons.append({"texto": "Golden Cross", "tipo": "positivo"})
        else:
            score -= 1
            reasons.append({"texto": "Death Cross", "tipo": "negativo"})

    if vol_ratio and vol_ratio >= 2.0:
        score += 1
        reasons.append({"texto": f"Vol {vol_ratio}x promedio", "tipo": "alerta"})

    if dist_min_52w is not None and dist_min_52w <= 5:
        score += 2
        reasons.append({"texto": f"Cerca mín 52w (+{dist_min_52w:.1f}%)", "tipo": "positivo"})

    if dist_max_52w is not None and dist_max_52w >= -3:
        score -= 1
        reasons.append({"texto": f"Cerca máx 52w ({dist_max_52w:.1f}%)", "tipo": "negativo"})

    if score >= 4:   signal = "COMPRA FUERTE"
    elif score >= 2: signal = "COMPRA"
    elif score <= -4: signal = "VENTA FUERTE"
    elif score <= -2: signal = "VENTA"
    elif score >= 1:  signal = "ALCISTA"
    elif score <= -1: signal = "BAJISTA"
    else:             signal = "NEUTRO"

    return signal, score, reasons

# ── Función principal de análisis ─────────────────────────────────────────────

def analizar_ticker(iol_client, ticker: str, mercado: str = "BCBA") -> dict:
    base = {
        "ticker": ticker,
        "mercado": mercado,
        "error": None,
        "timestamp": datetime.now().isoformat(),
    }
    try:
        cot = iol_client.get_cotizacion(ticker, mercado)

        price = cot.get("ultimoPrecio") or cot.get("ultimo") or cot.get("precio")
        if not price:
            return {**base, "error": "sin precio"}

        var_dia    = cot.get("variacion") or cot.get("variacionPorcentual", 0)
        volumen    = cot.get("volumenNominal") or cot.get("volumen", 0)
        max52      = cot.get("maximo52semanas")
        min52      = cot.get("minimo52semanas")
        apertura   = cot.get("apertura")
        maximo_dia = cot.get("maximo")
        minimo_dia = cot.get("minimo")

        hist = iol_client.get_historico(ticker, dias=300, mercado=mercado)
        closes, volumes = [], []

        # La API puede devolver lista directa o un dict con clave de datos
        if isinstance(hist, dict):
            # Algunos endpoints envuelven en {"historico": [...]} o similar
            for key in ("historico", "datos", "series", "cotizaciones", "items"):
                if key in hist and isinstance(hist[key], list):
                    hist = hist[key]
                    break

        if isinstance(hist, list):
            for d in sorted(hist, key=lambda x: x.get("fechaHora", x.get("fecha", ""))):
                p = (
                    d.get("precio")
                    or d.get("ultimoPrecio")
                    or d.get("cierre")
                    or d.get("ultimo")
                )
                v = d.get("volumenNominal") or d.get("volumen", 0)
                if p:
                    closes.append(float(p))
                    volumes.append(float(v or 0))

        if len(closes) < 15:
            logger.warning(f"{ticker}: histórico insuficiente ({len(closes)} velas), RSI/SMAs no calculables")

        closes.append(float(price))
        volumes.append(float(volumen or 0))

        rsi       = calc_rsi(closes, 14)
        sma20     = calc_sma(closes, 20)
        sma50     = calc_sma(closes, 50)
        sma200    = calc_sma(closes, 200)
        vol_ratio = calc_volume_ratio(volumes, 20)
        dist      = calc_dist_52w(float(price), max52, min52)

        signal, score, reasons = detect_signal(
            rsi, sma20, sma50, sma200, float(price), vol_ratio,
            dist["dist_min_52w"], dist["dist_max_52w"]
        )

        return {
            **base,
            "price":        price,
            "var_dia":      var_dia,
            "apertura":     apertura,
            "maximo_dia":   maximo_dia,
            "minimo_dia":   minimo_dia,
            "volumen":      volumen,
            "max52":        max52,
            "min52":        min52,
            "rsi":          rsi,
            "sma20":        sma20,
            "sma50":        sma50,
            "sma200":       sma200,
            "vol_ratio":    vol_ratio,
            "dist_max_52w": dist["dist_max_52w"],
            "dist_min_52w": dist["dist_min_52w"],
            "signal":       signal,
            "score":        score,
            "reasons":      reasons,
            "closes_count": len(closes),
        }
    except Exception as e:
        logger.error(f"Error analizando {ticker}: {e}")
        return {**base, "error": str(e)}
