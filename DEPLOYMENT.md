# Guía de Despliegue en Servidor de Producción (VPS con Ollama y PM2)

Esta guía detalla el procedimiento para desplegar la plataforma agéntica en un servidor VPS Ubuntu/Debian con **Ollama** (ejecución de modelos LLM locales/on-premise) y **PM2** (gestor de procesos de producción).

---

## 📋 Requisitos Previos en el Servidor

### 1. Node.js (>= 20.9.0) o Bun
> [!IMPORTANT]
> Next.js 16 requiere obligatoriamente **Node.js versión 20.9.0 o superior**. Si el servidor cuenta con Node.js 18 u otra versión anterior, Next.js fallará en compilación y tiempo de ejecución.

Para actualizar Node.js en Ubuntu mediante `nvm` o NodeSource:
```bash
# Con NVM:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20.20.2
nvm use 20.20.2
nvm alias default 20.20.2

# Verificar:
node -v   # v20.20.2 o superior
npm -v
```

### 2. PM2 (Process Manager)
Instalar globalmente para mantener la aplicación en ejecución persistente y reinicios automáticos:
```bash
npm install -g pm2
```

### 3. Servicio Ollama
Asegurar que Ollama esté levantado y escuchando en `http://127.0.0.1:11434`:
```bash
# Verificar estado del servicio del sistema
systemctl status ollama

# Listar modelos disponibles
ollama list

# Descargar modelo de razonamiento recomendado para el TFM
ollama pull deepseek-r1:7b
```

---

## 🚀 Despliegue Paso a Paso

### 1. Instalar dependencias del monorepo
El repositorio utiliza workspaces estándar de npm/Bun:
```bash
# Si se dispone de Bun:
bun install

# O con npm estándar:
npm install
```

### 2. Configuración de Variables de Entorno (`.env`)
Crear el archivo `.env` en la raíz del proyecto a partir de la plantilla:
```bash
cp .env.example .env
nano .env
```

Asegurar los siguientes valores según el entorno del servidor:
```ini
# Configuración del servidor y puerto de la aplicación Next.js
PORT=3002
NODE_ENV=production

# Conexión con Ollama local
OLLAMA_BASE_URL=http://127.0.0.1:11434
EVAL_MODEL=deepseek-r1:7b

# (Opcional) Proveedores de respaldo / API Keys
GOOGLE_API_KEY=
OPENAI_API_KEY=

# (Opcional) Trazabilidad con Phoenix / OpenInference
PHOENIX_COLLECTOR_ENDPOINT=http://127.0.0.1:6006
```

### 3. Compilación del Código
Compilar el paquete `@tfm/core` (TypeScript a JavaScript CJS/ESM) y compilar la aplicación `web` (Next.js):
```bash
# Con Bun:
bun run --cwd core build
bun run --cwd web build

# O con npm:
npm run build --workspace=@tfm/core
npm run build --workspace=web
```

---

## 🔄 Gestión del Servicio con PM2

El repositorio incluye el archivo [ecosystem.config.cjs](file:///Users/adrian/Documents/Universidad/TFM/ecosystem.config.cjs) configurado para arrancar directamente el servidor optimizado de Next.js (`node_modules/next/dist/bin/next start`) leyendo dinámicamente el `PORT` y las variables de entorno de `.env`.

### Iniciar la aplicación
Desde la raíz del repositorio:
```bash
pm2 start ecosystem.config.cjs
```

### Asegurar persistencia ante reinicios del VPS
```bash
pm2 save
pm2 startup
# Ejecutar el comando generado por 'pm2 startup' si es la primera vez que se configura en el VPS
```

### Comandos de Mantenimiento y Monitorización
```bash
# Ver estado de los procesos
pm2 status

# Monitor interactivo de CPU y memoria
pm2 monit

# Ver logs en tiempo real (vital para depurar llamadas agénticas)
pm2 logs Metodologia-Integracion-Agentes-Preproyecto

# Reiniciar la aplicación tras una actualización de código
pm2 restart Metodologia-Integracion-Agentes-Preproyecto

# Recargar con cero tiempo de inactividad
pm2 reload Metodologia-Integracion-Agentes-Preproyecto

# Detener el servicio
pm2 stop Metodologia-Integracion-Agentes-Preproyecto
```

---

## 🌐 Arquitectura Monopuerto Autónoma 

A diferencia de proyectos tradicionales donde el frontend y el backend se ejecutan en procesos separados (como React en un puerto y Flask/FastAPI en otro, requiriendo Nginx para enrutar y evitar errores de CORS), esta plataforma opera como un **monorepo unificado bajo Next.js 16**:

* **Un solo proceso y un solo puerto:** Tanto la interfaz interactiva (React) como las rutas de la API del motor agéntico (`/api/chat`, `/api/sessions`, etc.) son servidas por el mismo proceso de Node.js gestionado por PM2 en el puerto configurado (ej. `3002`).
* **Cero problemas de CORS:** Todas las peticiones entre la interfaz y el orquestador del grafo se resuelven de forma local en el mismo origen.
* **Comunicación interna con Ollama:** El servidor web se comunica localmente por HTTP con el demonio de Ollama (`http://127.0.0.1:11434`), de modo que el navegador del usuario nunca necesita acceder a los puertos internos de la IA.

Basta con acceder directamente mediante la IP del VPS y el puerto asignado en `.env`:
```
http://<IP_DEL_VPS>:<PORT> 
```

> [!NOTE]
> **Dominio público o SSL (Opcional):** Si en un entorno corporativo se desea mapear un nombre de dominio con certificado HTTPS (puerto 443), se puede anteponer opcionalmente un proxy inverso (Nginx, Caddy o Cloudflare). En caso de usar Nginx, recuerde únicamente desactivar el buffer de proxy (`proxy_buffering off;` y `proxy_set_header X-Accel-Buffering no;`) para preservar el streaming en tiempo real por Server-Sent Events (SSE). Para el funcionamiento del sistema en el VPS no es necesario.
