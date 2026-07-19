# 🔒 GerardOS Private — Tu GitHub Privado en la Nube

Una versión privada, protegida y auto-hospedada del explorador de proyectos GerardOS, inspirada en la interfaz de escritorio de macOS. Te permite gestionar y visualizar todos tus repositorios públicos y privados de GitHub de forma segura y centralizada.

Desplegable de forma **100% gratuita** en **Cloudflare Pages + Functions** (sin cold starts y con HTTPS automático).

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend**: HTML5, CSS3 (Liquid Glass CSS sin frameworks), JavaScript (ES6+ ESM) y Lucide Icons.
*   **Backend (Serverless)**: Cloudflare Pages Functions (V8 Isolates, 0 cold starts).
*   **Autenticación**: JWT (JSON Web Tokens) en cookies seguras (`httpOnly`, `Secure`, `SameSite=Lax`) firmado mediante HMAC-SHA256 con la Web Crypto API nativa.
*   **Seguridad**: Hashing de contraseña mediante PBKDF2 (SHA-256) con 600,000 iteraciones y cabeceras de seguridad globales (CSP, HSTS, XSS Protection).

---

## 🚀 Características del Dashboard Privado

1.  **Seguridad Blindada**: Pantalla de bloqueo al estilo macOS. El token de GitHub nunca se expone al cliente, se almacena de forma segura en las variables de entorno de Cloudflare.
2.  **Soporte de Repositorios Privados**: Muestra tus repositorios privados con un icono de candado 🔒.
3.  **Explorador de Archivos Completo**: Examina el código y estructura de cualquier repositorio (público o privado).
4.  **Historial de Commits**: Línea de tiempo con los últimos commits realizados por cada rama.
5.  **Gestor de Ramas**: Cambia de rama para inspeccionar el árbol de código en tiempo real.
6.  **Acciones de Escritura**: Crea nuevos repositorios y elimina repositorios existentes directamente desde el panel (con doble confirmación de seguridad).

---

## 💻 Configuración Local y Despliegue

### Paso 1: Obtener tu Token de GitHub (PAT)
1.  Ve a tu cuenta de GitHub → **Settings** → **Developer Settings** → **Personal Access Tokens** → **Fine-grained tokens**.
2.  Haz clic en **Generate new token**.
3.  Establece el nombre: `GerardOS Private`.
4.  En **Repository access**, selecciona **All repositories** (para poder ver y gestionar tus repos privados).
5.  En **Permissions**, otorga los siguientes accesos:
    *   `Metadata` → **Read-only** (para listar tus repositorios).
    *   `Contents` → **Read and write** (para examinar archivos, cambiar de rama y ver commits).
    *   `Administration` → **Read and write** (para crear y eliminar repositorios).
6.  Genera el token y cópialo de inmediato.

### Paso 2: Generar tu Hash de Contraseña
Para no guardar tu contraseña en texto plano, generamos un hash criptográfico PBKDF2 utilizando PowerShell:

1.  Abre PowerShell en este directorio.
2.  Ejecuta el script:
    ```powershell
    .\scripts\generate-hash.ps1 -password "TU_CONTRASEÑA_DESEADA"
    ```
3.  Copia la línea generada (ej. `pbkdf2:sha256:600000:sal_hex:hash_hex`). Este será tu `PASSWORD_HASH`.

### Paso 3: Subir a tu cuenta de GitHub
Dado que este proyecto contiene tus archivos y configuraciones, debes subirlo a un nuevo repositorio **privado** en tu cuenta de GitHub.
Ejecuta el script de subida integrado (no requiere Git local instalado):

1.  En PowerShell, ejecuta:
    ```powershell
    .\scripts\upload-to-github.ps1 -pat "TU_TOKEN_DE_GITHUB" -repo "gerardos-private"
    ```
2.  El script creará automáticamente el repositorio privado `gerardos-private` en tu cuenta de GitHub y subirá todos los archivos del proyecto.

### Paso 4: Desplegar en Cloudflare Pages (Gratis)
1.  Inicia sesión o regístrate en [Cloudflare](https://dash.cloudflare.com/).
2.  Navega a **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3.  Conecta tu cuenta de GitHub y selecciona el repositorio privado recién creado `gerardos-private`.
4.  En la configuración del build:
    *   **Framework preset**: None
    *   **Build command**: *Dejar en blanco*
    *   **Output directory**: `public`
5.  Ve a la pestaña de **Variables de entorno** del proyecto en Cloudflare Pages y añade las siguientes variables en la sección de producción y previsualización:
    *   `GITHUB_PAT`: Tu token de acceso de GitHub (obtenido en el Paso 1).
    *   `GITHUB_USERNAME`: Tu nombre de usuario de GitHub (`GerardMaestre`).
    *   `JWT_SECRET`: Una frase o contraseña larga aleatoria para firmar las cookies de sesión.
    *   `PASSWORD_HASH`: El hash criptográfico de tu contraseña (obtenido en el Paso 2).
    *   `NODE_ENV`: `production`
6.  Haz clic en **Save and Deploy**. ¡Tu panel privado estará disponible de inmediato en un dominio tipo `https://gerardos-private.pages.dev`!
