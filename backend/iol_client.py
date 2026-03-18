"""
IOL API Client — maneja autenticación, refresh de token y todos los endpoints.
"""
import os
import time
import logging
import requests
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

IOL_BASE = "https://api.invertironline.com"

class IOLClient:
    def __init__(self):
        self.username = os.environ.get("IOL_USERNAME", "")
        self.password = os.environ.get("IOL_PASSWORD", "")
        self.access_token = None
        self.refresh_token = None
        self.token_expiry = 0

    def _get_token(self):
        """Obtiene token inicial con usuario y contraseña."""
        resp = requests.post(
            f"{IOL_BASE}/token",
            data={
                "username": self.username,
                "password": self.password,
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        self.access_token = data["access_token"]
        self.refresh_token = data.get("refresh_token")
        expires_in = int(data.get("expires_in", 1800))
        self.token_expiry = time.time() + expires_in - 60  # margen de 60s
        logger.info("Token IOL obtenido OK")

    def _refresh(self):
        """Refresca token sin re-login."""
        try:
            resp = requests.post(
                f"{IOL_BASE}/token",
                data={
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            self.access_token = data["access_token"]
            self.refresh_token = data.get("refresh_token", self.refresh_token)
            expires_in = int(data.get("expires_in", 1800))
            self.token_expiry = time.time() + expires_in - 60
            logger.info("Token IOL refrescado OK")
        except Exception as e:
            logger.warning(f"Refresh falló ({e}), re-login...")
            self._get_token()

    def _ensure_token(self):
        if not self.access_token:
            self._get_token()
        elif time.time() > self.token_expiry:
            if self.refresh_token:
                self._refresh()
            else:
                self._get_token()

    def _headers(self):
        self._ensure_token()
        return {"Authorization": f"Bearer {self.access_token}"}

    def get(self, path, params=None):
        url = f"{IOL_BASE}{path}"
        resp = requests.get(url, headers=self._headers(), params=params, timeout=20)
        resp.raise_for_status()
        return resp.json()

    # ── Endpoints de mercado ──────────────────────────────────────────────────

    def get_cotizacion(self, ticker, mercado="BCBA"):
        return self.get(f"/api/v2/{mercado}/Titulos/{ticker}/Cotizacion")

    def get_historico(self, ticker, dias=300, mercado="BCBA"):
        """
        Obtiene serie histórica. Intenta primero con ajuste (para acciones locales),
        si falla hace fallback sin ajuste (necesario para CEDEARs y algunos paneles).
        dias=300 para tener datos suficientes para SMA200 (~200 días hábiles).
        """
        hoy = datetime.now()
        desde = hoy - timedelta(days=dias)
        desde_str = desde.strftime("%Y-%m-%d")
        hasta_str = hoy.strftime("%Y-%m-%d")
        base_path = f"/api/v2/{mercado}/Titulos/{ticker}/Cotizacion/seriehistorica/{desde_str}/{hasta_str}"

        # Intentar primero con ajuste (acciones locales)
        try:
            result = self.get(f"{base_path}/ajustada")
            if isinstance(result, list) and len(result) > 0:
                return result
        except Exception:
            pass

        # Fallback sin ajuste (CEDEARs y otros)
        try:
            result = self.get(f"{base_path}/sinAjustar")
            if isinstance(result, list) and len(result) > 0:
                return result
        except Exception:
            pass

        # Segundo fallback: sin sufijo (algunos endpoints no lo requieren)
        return self.get(base_path)

    def get_panel(self, panel, mercado="BCBA"):
        """Panel completo: acciones, cedears, etc."""
        return self.get(f"/api/v2/{mercado}/Titulos/{panel}/cotizacion/todos")

    def get_portafolio(self, pais="argentina"):
        return self.get(f"/api/v2/portafolio/{pais}")

    def get_estado_cuenta(self):
        return self.get("/api/v2/estadocuenta")

    def get_operaciones(self):
        return self.get("/api/v2/operaciones")

# Instancia singleton
iol = IOLClient()
