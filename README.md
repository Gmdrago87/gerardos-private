# 🖥️ GerardOS Private — Tu GitHub Privado en la Nube

Una versión privada, protegida y auto-hospedada del explorador de proyectos GerardOS, inspirada en la interfaz de escritorio de macOS. Te permite gestionar y visualizar todos tus repositorios públicos y privados de GitHub de forma segura y centralizada.

Desplegable de forma **100% gratuita** en **Cloudflare Pages + Functions** (sin cold starts y con HTTPS automático).

---

## 🚀 Novedades en la versión 1.2.0

- ✅ **Seguridad mejorada**: Eliminados todos los secretos del repositorio
- ✅ **Rate Limiting**: Protección contra ataques de fuerza bruta
- ✅ **Service Worker**: Cache offline y mejor rendimiento
- ✅ **Bundling**: JavaScript y CSS optimizados para producción
- ✅ **CSP estricta**: Políticas de seguridad más robustas
- ✅ **Manejo de errores mejorado**: Respuestas consistentes en la API
- ✅ **CI/CD**: Scripts de build y despliegue automatizado

---

## 🛡️ Tecnologías Utilizadas

| Área | Tecnología |
|------|------------|
| **Frontend** | HTML5, CSS3 (Liquid Glass), JavaScript (ES6+ ESM) |
| **Backend** | Cloudflare Pages Functions (V8 Isolates, 0 cold starts) |
| **Autenticación** | GitHub OAuth App + JWT (HMAC-SHA256) |
| **Seguridad** | CSP, HSTS, CSRF Protection, Rate Limiting |
| **Cache** | Service Worker, Cloudflare KV (opcional) |
| **Bundling** | esbuild |

---

## 🔐 Características de Seguridad

1. **Autenticación OAuth Única**: Solo el usuario propietario autorizado (`GITHUB_USERNAME`) puede iniciar sesión
2. **Protección CSRF**: Tokens dinámicos `state` para el flujo OAuth
3. **JWT Seguro**: Cookies firmadas con HMAC-SHA256 y Web Crypto API
4. **CSP Estricta**: Políticas de contenido que previenen XSS
5. **Rate Limiting**: Protección contra ataques de fuerza bruta
6. **Sin Secretos en el Código**: Todas las credenciales se configuran via variables de entorno

---

## 📦 Características del Dashboard Privado

1. **Autenticación OAuth única**: Solo el usuario propietario autorizado puede acceder
2. **Soporte de Repositorios Privados**: Muestra y permite auditar repositorios privados
3. **Explorador de Archivos Completo**: Examina código y estructura de cualquier repositorio
4. **Historial de Commits y Ramas**: Revisa commits y cambia de rama en tiempo real
5. **Acciones de Escritura**: Crea y elimina repositorios desde el panel
6. **Editor de Archivos**: Crea, edita y elimina archivos directamente
7. **Búsqueda Avanzada**: Filtra repositorios por nombre, lenguaje, etc.
8. **Modo Offline**: Service Worker para cache de recursos estáticos

---

## ⚙️ Configuración Local y Despliegue

### Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- Cuenta en [Cloudflare](https://dash.cloudflare.com/)
- Cuenta en [GitHub](https://github.com/)

---

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/Gmdrago87/gerardos-private.git
cd gerardos-private
npm install
```

---

### Paso 2: Crear una GitHub OAuth App

1. Inicia sesión en [GitHub.com](https://github.com/) y ve a **Settings** → **Developer Settings** → **OAuth Apps**
2. Haz clic en **New OAuth App**
3. Rellena los datos:
   - **Application name**: `GerardOS Private`
   - **Homepage URL**: `https://gerardos-private.pages.dev` (o tu dominio)
   - **Authorization callback URL**: `https://gerardos-private.pages.dev/api/oauth/callback`
4. Haz clic en **Register application**
5. Copia el **Client ID** y genera un nuevo **Client Secret** (¡cópialo de inmediato!)

---

### Paso 3: Desplegar en Cloudflare Pages (Gratis)

1. Inicia sesión o regístrate en [Cloudflare](https://dash.cloudflare.com/)
2. Navega a **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Selecciona tu repositorio `gerardos-private`
4. En la configuración del build:
   - **Framework preset**: None
   - **Build command**: `npm run build:all`
   - **Output directory**: `public`

---

### Paso 4: Configurar las Variables de Entorno en Cloudflare

En la pestaña **Settings** → **Environment variables** de tu proyecto en Cloudflare Pages, añade las siguientes variables en **Production** y **Preview**:

| Variable (Name) | Valor (Value) | Descripción |
|:---|:---|:---|
| `GITHUB_CLIENT_ID` | Tu Client ID de GitHub | Obténlo en tu GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | Tu Client Secret de GitHub | Generado en tu GitHub OAuth App |
| `GITHUB_USERNAME` | Tu usuario de GitHub (ej. `GerardMaestre`) | Usuario único autorizado para acceder |
| `JWT_SECRET` | Una clave secreta larga y aleatoria | Se usa para firmar las cookies de sesión |
| `NODE_ENV` | `production` | Modo de producción seguro |

**Importante**: El valor de `JWT_SECRET` debe ser una cadena larga y aleatoria (mínimo 32 caracteres). Puedes generar una con:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Paso 5: Configurar KV Storage (Opcional)

Para habilitar cache persistente:

1. Ve a **Workers & Pages** → **KV** → **Create namespace**
2. Nombra el namespace (ej. `CACHE_KV`)
3. Copia el **ID** del namespace
4. Descomenta y configura en `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "tu-id-de-kv"
```

---

### Paso 6: ¡Listo!

Guarda las variables y vuelve a desplegar (*Retry deployment*). Tu panel estará 100% blindado y accesible solo para ti a través de GitHub OAuth!

Accede a: `https://gerardos-private.pages.dev`

---

## 🏗️ Desarrollo Local

### Instalar dependencias
```bash
npm install
```

### Configurar variables de entorno locales
Crea un archivo `.dev.vars` en la raíz del proyecto:
```env
GITHUB_CLIENT_ID=tu_client_id
GITHUB_CLIENT_SECRET=tu_client_secret
JWT_SECRET=tu_jwt_secret_seguro
GITHUB_USERNAME=tu_usuario_github
NODE_ENV=development
```

### Iniciar el servidor de desarrollo
```bash
npm run start
```

El servidor estará disponible en: `http://localhost:8789`

### Build para producción
```bash
npm run build:all
```

Esto generará:
- `public/bundle.js` - JavaScript bundlado y minificado
- `public/style.min.css` - CSS minificado

---

## 📁 Estructura del Proyecto

```
gerardos-private/
├── public/                          # Frontend
│   ├── index.html                  # HTML principal
│   ├── style.css                   # Estilos principales
│   ├── app.js                      # Aplicación principal
│   ├── modules/                    # Módulos JavaScript
│   │   ├── api.js                  # Llamadas a la API
│   │   ├── auth.js                 # Autenticación
│   │   ├── state.js                # Estado de la aplicación
│   │   ├── ui.js                   # Renderizado de UI
│   │   ├── utils.js                # Utilidades
│   │   ├── shortcuts.js            # Atajos de teclado
│   │   ├── ai_ui.js                # Interfaz de IA
│   │   └── futuristic.js           # Efectos futuristas
│   ├── sw.js                       # Service Worker
│   └── manifest.json              # Manifest PWA
├── functions/                      # Backend (Cloudflare Functions)
│   ├── _shared/                    # Utilidades compartidas
│   │   ├── cookies.js              # Manejo de cookies
│   │   ├── errors.js               # Manejo de errores
│   │   ├── github.js               # Utilidades de GitHub
│   │   ├── http.js                 # Respuestas HTTP
│   │   ├── jwt.js                  # JWT utilities
│   │   └── rateLimit.js            # Rate limiting
│   ├── _middleware.js              # Middleware global
│   ├── api/                        # API endpoints
│   │   ├── _middleware.js          # Middleware de API
│   │   ├── ai.js                   # Endpoint de IA
│   │   ├── logout.js               # Cerrar sesión
│   │   ├── session.js              # Verificar sesión
│   │   ├── version.js              # Versión de la app
│   │   └── repos/                  # Endpoints de repositorios
│   │       ├── index.js            # Listar repositorios
│   │       └── [name]/              # Operaciones por repositorio
│   │           ├── index.js        # Info del repositorio
│   │           ├── tree.js         # Árbol de archivos
│   │           ├── file.js         # Contenido de archivo
│   │           ├── commits.js      # Historial de commits
│   │           ├── branches.js     # Listar ramas
│   │           ├── issues.js       # Issues del repositorio
│   │           └── actions.js      # Acciones (crear/editar/eliminar)
│   └── oauth/                      # Autenticación OAuth
│       ├── login.js               # Iniciar login
│       └── callback.js             # Callback de OAuth
├── scripts/                        # Scripts de build
│   ├── build.js                    # Build principal
│   ├── build-js.js                 # Bundler JavaScript
│   ├── build-css.js                # Minificador CSS
│   ├── lint-js.js                  # Linter JavaScript
│   └── lint-css.js                 # Linter CSS
├── .gitignore                      # Ignorar archivos
├── package.json                    # Dependencias
├── wrangler.toml                   # Configuración Cloudflare
└── README.md                       # Este archivo
```

---

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm start` | Inicia el servidor de desarrollo |
| `npm run build` | Ejecuta build completo |
| `npm run build:all` | Build JavaScript y CSS |
| `npm run build:js` | Bundle JavaScript |
| `npm run build:css` | Minifica CSS |
| `npm run lint` | Ejecuta linting |
| `npm run lint:js` | Linting JavaScript |
| `npm run lint:css` | Linting CSS |
| `npm run deploy` | Despliega en Cloudflare |
| `npm run deploy:prod` | Build + Deploy |

---

## 🛡️ Mejoras de Seguridad Implementadas

### 1. Eliminación de Secretos
- ❌ **Antes**: Secretos en `wrangler.toml` y código
- ✅ **Ahora**: Todas las credenciales via variables de entorno

### 2. Protección CSRF
- Tokens `state` únicos para cada sesión de login
- Validación estricta en el callback OAuth

### 3. Cookies Seguras
- `HttpOnly`: No accesibles via JavaScript
- `Secure`: Solo en HTTPS
- `SameSite=Strict`: Protección contra CSRF

### 4. JWT Seguro
- Firmado con HMAC-SHA256
- Expiración de 30 minutos
- Validación estricta de claims

### 5. CSP (Content Security Policy)
- Bloqueo de scripts inline no autorizados
- Restricción de dominios externos
- Protección contra XSS

### 6. Rate Limiting
- Límite de 5 peticiones por minuto para login
- Límite de 30 peticiones por minuto para repositorios
- Límite de 60 peticiones por minuto para endpoints generales

---

## 🚀 Optimizaciones de Rendimiento

### 1. Service Worker
- Cache de recursos estáticos
- Modo offline básico
- Cache de API con TTL

### 2. Bundling
- JavaScript: esbuild para bundling y minificación
- CSS: Minificación manual
- Reducción de peticiones HTTP

### 3. Preload de Fuentes
- Carga anticipada de Google Fonts
- Fallback para navegadores sin JavaScript

### 4. Lazy Loading
- Imágenes con `loading="lazy"`
- Carga diferida de scripts no críticos

---

## 🤖 Integración con IA (Futuro)

El dashboard incluye un endpoint de IA (`/api/ai`) que puede ser extendido para:

- Análisis de código automático
- Generación de documentación
- Sugerencias de mejora
- Resúmenes de repositorios

Para habilitar funcionalidad real de IA, necesitarás:
1. Configurar un proveedor de IA (OpenAI, Anthropic, etc.)
2. Añadir las credenciales como variables de entorno
3. Implementar la lógica en `functions/api/ai.js`

---

## 📊 Monitorización (Opcional)

Puedes añadir Cloudflare Web Analytics para monitorizar el uso:

1. Ve a **Workers & Pages** → **Web Analytics**
2. Crea un nuevo sitio
3. Añade el script a `public/index.html`:

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "tu-token"}'></script>
```

---

## 🆘 Solución de Problemas

### Error: "Servidor desconfigurado"
**Causa**: Falta la variable de entorno `JWT_SECRET`
**Solución**: Configura todas las variables de entorno en Cloudflare Pages

### Error: "No autorizado: sesión no iniciada"
**Causa**: La cookie de sesión ha expirado o no existe
**Solución**: Inicia sesión nuevamente

### Error: "Acceso Denegado"
**Causa**: El usuario de GitHub no está en la lista de usuarios permitidos
**Solución**: Verifica que `GITHUB_USERNAME` incluya tu usuario de GitHub

### Error: "Demasiadas peticiones"
**Causa**: Has excedido el límite de peticiones
**Solución**: Espera un minuto y vuelve a intentarlo

### El Service Worker no se registra
**Causa**: El archivo `sw.js` no está en la raíz del directorio `public/`
**Solución**: Verifica que el archivo exista y sea accesible

---

## 📜 Licencia

MIT License - © 2024 Gerard Maestre

---

## 🙏 Agradecimientos

- [Cloudflare](https://www.cloudflare.com/) - Por su plataforma gratuita
- [GitHub](https://github.com/) - Por su API y OAuth
- [Lucide Icons](https://lucide.dev/) - Por los iconos
- [D3.js](https://d3js.org/) - Por las visualizaciones
- [Three.js](https://threejs.org/) - Por los gráficos 3D

---

## 📞 Contacto

Para preguntas o soporte, abre un issue en el repositorio o contacta directamente.

---

**¡Disfruta de tu dashboard privado de GitHub! 🚀**
