# IOL Dashboard — Guía de Deploy

App de análisis técnico del mercado argentino conectada a la API de IOL.
Screener de Merval + Panel General + CEDEARs con RSI, SMAs, volumen anómalo y señales automáticas.

---

## Estructura

```
iol-dashboard/
├── backend/        → Python + FastAPI (deploy en Render)
├── frontend/       → React + Vite   (deploy en Netlify)
├── render.yaml     → config de Render
└── netlify.toml    → config de Netlify
```

---

## PASO 1 — Instalar herramientas (solo la primera vez)

1. **Python 3.11+** → https://python.org/downloads → siguiente, siguiente, instalar
2. **Node.js 20+**  → https://nodejs.org → LTS → siguiente, siguiente, instalar
3. **Git**          → https://git-scm.com/downloads → siguiente, siguiente, instalar

Verificar que instalaron abriendo una terminal:
```bash
python --version   # debe decir 3.11+
node --version     # debe decir 20+
git --version
```

---

## PASO 2 — Subir el código a GitHub

```bash
cd iol-dashboard
git init
git add .
git commit -m "Initial commit - IOL Dashboard"
```

En GitHub.com → New repository → nombre: `iol-dashboard` → Create

```bash
git remote add origin https://github.com/TU-USUARIO/iol-dashboard.git
git branch -M main
git push -u origin main
```

---

## PASO 3 — Deploy del Backend en Render

1. Ir a https://render.com → Sign in with GitHub
2. **New** → **Web Service**
3. Conectar el repo `iol-dashboard`
4. Configurar:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
5. En **Environment Variables** agregar:
   ```
   IOL_USERNAME    = tu_email@iol.com
   IOL_PASSWORD    = tu_password
   ALLOWED_ORIGINS = http://localhost:5173   (por ahora, actualizamos después)
   SELF_URL        = (vacío por ahora, actualizamos después)
   ```
6. Click **Create Web Service**
7. Esperar que diga **Live** (2-3 min)
8. Copiar la URL que te da Render (algo como `https://iol-dashboard-api.onrender.com`)
9. Volver a **Environment** y actualizar:
   ```
   SELF_URL = https://iol-dashboard-api.onrender.com
   ```

Verificar que funciona: abrir `https://iol-dashboard-api.onrender.com/health` → debe decir `{"status":"ok"}`

---

## PASO 4 — Deploy del Frontend en Netlify

1. Editar `netlify.toml` y reemplazar `TU-BACKEND.onrender.com` con tu URL real de Render
2. Hacer commit y push:
   ```bash
   git add netlify.toml
   git commit -m "Add Render URL to netlify config"
   git push
   ```
3. Ir a https://netlify.com → Sign in with GitHub
4. **Add new site** → **Import an existing project** → GitHub → seleccionar `iol-dashboard`
5. Configurar:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
6. En **Environment variables** agregar:
   ```
   VITE_API_URL = https://TU-BACKEND.onrender.com/api
   ```
7. Click **Deploy site**
8. Copiar la URL de Netlify (algo como `https://iol-dashboard-abc123.netlify.app`)

---

## PASO 5 — Conectar front con back (CORS)

1. Ir a Render → tu servicio → **Environment**
2. Actualizar `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS = https://iol-dashboard-abc123.netlify.app,http://localhost:5173
   ```
3. Render va a hacer redeploy automático

---

## PASO 6 — Probar todo

1. Abrir la URL de Netlify
2. Ir a la tab **Oportunidades** → debería mostrar "Sin datos aún"
3. Click en **↻** (refresh) en la barra superior para lanzar el screener manualmente
4. Ver en **Screener** cómo se van cargando los tickers
5. Configurar una alerta en la tab **Alertas**

---

## Desarrollo local

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # completar con tus credenciales IOL
uvicorn main:app --reload

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

Frontend en http://localhost:5173
Backend en http://localhost:8000
Docs de la API en http://localhost:8000/docs

---

## Horario del screener

Corre automáticamente **lunes a viernes de 11:00 a 17:00 (Buenos Aires)**,
cada 15 minutos. También hay un ping anti-sleep cada 14 minutos para mantener
el servidor de Render activo durante el horario de mercado.

Fuera del horario se puede ejecutar manualmente con el botón ↻.

---

## Tickers monitoreados

- **Merval:** 30 principales
- **Panel General:** 30 más líquidos
- **CEDEARs:** ~70 (tech, finance, consumer, latam, ETFs)

Total: ~130 tickers por scan.
