# 🔒 GerardOS Private — Tu GitHub Privado en la Nube

Una versión privada, protegida y auto-hospedada del explorador de proyectos GerardOS, inspirada en la interfaz de escritorio de macOS. Te permite gestionar y visualizar todos tus repositorios públicos y privados de GitHub de forma segura y centralizada.

Desplegable de forma **100% gratuita** en **Cloudflare Pages + Functions** (sin cold starts y con HTTPS automático).

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend**: HTML5, CSS3 (Liquid Glass CSS sin frameworks), JavaScript (ES6+ ESM) y Lucide Icons.
*   **Backend (Serverless)**: Cloudflare Pages Functions (V8 Isolates, 0 cold starts).
*   **Autenticación**: GitHub OAuth App + JWT (JSON Web Tokens) en cookies seguras (`HttpOnly`, `Secure`, `SameSite=Strict`) firmadas mediante HMAC-SHA256 con Web Crypto API.
*   **Seguridad**: Protección CSRF mediante tokens dinámicos `state`, prevención de Path Traversal, desinfección estricta contra XSS y cabeceras globales de seguridad (CSP, HSTS, X-Frame-Options).

---

## 🚀 Características del Dashboard Privado

1.  **Autenticación OAuth Única**: Solo el usuario propietario autorizado (`GITHUB_USERNAME`) puede iniciar sesión a través del flujo oficial de GitHub.
2.  **Soporte de Repositorios Privados**: Muestra y permite auditar tus repositorios privados con un icono de candado 🔒.
3.  **Explorador de Archivos Completo**: Examina el código y estructura de cualquier repositorio (público o privado).
4.  **Historial de Commits y Ramas**: Revisa los últimos commits y cambia de rama para inspeccionar el árbol en tiempo real.
5.  **Acciones de Escritura**: Crea y elimina repositorios directamente desde el panel (con confirmación de seguridad).

---

## 💻 Configuración Local y Despliegue

### Paso 1: Crear una GitHub OAuth App
1. Inicia sesión en [GitHub.com](https://github.com/) y ve a **Settings** → **Developer Settings** → **OAuth Apps**.
2. Haz clic en **New OAuth App**.
3. Rellena los datos:
   * **Application name**: `GerardOS Private`
   * **Homepage URL**: La URL de tu Cloudflare Pages (ej. `https://gerardos-private.pages.dev`) o `http://localhost:8789` para desarrollo local.
   * **Authorization callback URL**: `https://gerardos-private.pages.dev/api/oauth/callback` (o `http://localhost:8789/api/oauth/callback` para desarrollo local).
4. Haz clic en **Register application**.
5. Copia el **Client ID** y genera un nuevo **Client Secret** (cópialo de inmediato).

---

### Paso 2: Desplegar en Cloudflare Pages (Gratis)
1. Inicia sesión o regístrate en [Cloudflare](https://dash.cloudflare.com/).
2. Navega a **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Selecciona tu repositorio privado `gerardos-private`.
4. En la configuración del build:
   * **Framework preset**: None
   * **Build command**: *Dejar en blanco*
   * **Output directory**: `public`

---

### Paso 3: Configurar las Variables de Entorno en Cloudflare
En la pestaña **Settings** → **Environment variables** de tu proyecto en Cloudflare Pages, añade las siguientes variables en **Production** y **Preview**:

| Variable (Name) | Valor (Value) | Descripción |
|:---|:---|:---|
| `GITHUB_CLIENT_ID` | Tu Client ID de GitHub | Obténlo en tu GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | Tu Client Secret de GitHub | Generado en tu GitHub OAuth App |
| `GITHUB_USERNAME` | Tu usuario de GitHub (ej. `GerardMaestre`) | Usuario único autorizado para acceder |
| `JWT_SECRET` | Una clave secreta larga y aleatoria | Se usa para firmar las cookies de sesión |
| `NODE_ENV` | `production` | Modo de producción seguro |

---

### Paso 4: ¡Listo!
Guarda las variables y vuelve a desplegar (*Retry deployment*). ¡Tu panel estará 100% blindado y accesible solo para ti a través de GitHub OAuth!
