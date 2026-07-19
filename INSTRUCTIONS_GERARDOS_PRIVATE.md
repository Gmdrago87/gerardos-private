# 🔒 Guía Completa de GerardOS Private — Tu Clon Privado de GitHub

Bienvenido al manual oficial de **GerardOS Private**. Este documento detalla la filosofía del proyecto, su arquitectura de seguridad y los pasos exactos que debes seguir para desplegar tu panel de control privado de forma 100% gratuita en la nube.

---

## 💡 La Idea del Proyecto

**GerardOS Private** es una plataforma personal, interactiva y protegida que funciona como un sistema operativo web (inspirado en la interfaz de escritorio de macOS) para gestionar, explorar y auditar **todos tus repositorios públicos y privados de GitHub** desde cualquier navegador del mundo sin comprometer la seguridad de tu cuenta.

### ¿Por qué existe este proyecto?
1. **Control Narrativo**: En lugar de depender de la vista genérica de perfiles de GitHub, tú decides cómo interactuar con tu trabajo.
2. **Acceso a Código Privado**: Te permite leer el código, ver los commits, examinar ramas e interactuar de forma segura con repositorios que no son públicos.
3. **Gestión Directa**: Incluye capacidades de lectura y escritura para crear y eliminar repositorios directamente desde tu panel sin abrir la web de GitHub.
4. **Privacidad Absoluta**: Nadie más que tú puede acceder al panel, gracias a un sistema de login inquebrantable basado en criptografía moderna.

---

## 🛡️ Arquitectura de Seguridad (Modelo de 9 Capas)

El sistema ha sido diseñado para ser **inquebrantable** frente a ataques web habituales:

1. **Cifrado de Tránsito (HTTPS)**: Todo el flujo de datos viaja encriptado de extremo a extremo de forma obligatoria.
2. **Contraseñas Robustas (PBKDF2-SHA256)**: La contraseña no se almacena en texto plano en ningún lugar. Se compara contra un hash derivado criptográficamente con 600,000 iteraciones y sal aleatoria.
3. **Autenticación sin Estado (JWT)**: Al hacer login, el servidor genera un JSON Web Token firmado criptográficamente con tu clave secreta.
4. **Cookies de Seguridad Estricta**: El JWT se guarda en una cookie con propiedades `HttpOnly` (el código JavaScript no la puede leer, previniendo robos por XSS), `Secure` (solo se envía por HTTPS) y `SameSite=Lax` (previene ataques CSRF).
5. **Token de GitHub (PAT) Oculto**: Tu Token de Acceso de GitHub vive estrictamente en el entorno seguro del servidor (Cloudflare Functions). **Nunca viaja al navegador**, por lo que es imposible que un atacante lo extraiga inspeccionando la página.
6. **Políticas de Seguridad en el Navegador (CSP y CORS)**: Restringe la carga de scripts e imágenes exclusivamente a dominios de confianza (como los avatares oficiales de GitHub) y rechaza peticiones de orígenes ajenos.
7. **Cabeceras HTTP Seguras (Helmet)**: Implementa automáticamente cabeceras como `X-Frame-Options` para evitar ataques de Clickjacking y `X-Content-Type-Options` para evitar sniffing de archivos.
8. **Protección DDoS y WAF Integrado**: Al ejecutarse sobre la red global de Cloudflare, tu panel está protegido de forma automática contra ataques de denegación de servicio y escaneos de vulnerabilidades maliciosas.
9. **Confirmación Adicional de Borrado**: Las acciones destructivas (como eliminar un repositorio) requieren que escribas manualmente el nombre del repositorio como paso final de confirmación en un modal de doble factor.

---

## 📁 Estructura del Repositorio

El proyecto se divide de forma limpia entre el Frontend y el Backend en la nube:

*   `/public`: Archivos estáticos de la interfaz de usuario (HTML, CSS de vidrio líquido, controladores de eventos en JS).
*   `/functions`: El servidor backend que corre en Cloudflare Pages Functions (Serverless).
*   `/scripts`: Herramientas de automatización en PowerShell para realizar la configuración criptográfica de forma local.

---

## 🚀 Guía de Configuración Paso a Paso (Cuando estés en Casa)

Sigue estas instrucciones detalladas en tu ordenador de casa para desplegar la web:

### Paso 1: Obtener tu Token de GitHub (PAT)
El token es la "llave" que usará tu backend seguro para comunicarse con la API de GitHub en tu nombre.

1. Inicia sesión en [GitHub.com](https://github.com/).
2. Ve a la esquina superior derecha, haz clic en tu avatar y selecciona **Settings** (Configuración).
3. En el menú de la izquierda, baja hasta el final y haz clic en **Developer Settings**.
4. Selecciona **Personal Access Tokens** ➔ **Fine-grained tokens**.
5. Haz clic en el botón **Generate new token**.
6. Configura el token:
   * **Token name**: `GerardOS Private Dashboard`
   * **Expiration**: 90 días (por seguridad, lo rotarás periódicamente).
   * **Repository access**: Selecciona **All repositories** (esto es crucial para que el panel pueda ver tus proyectos privados).
7. En la sección de **Permissions** (Permisos), busca y otorga los siguientes accesos de repositorio:
   * **Metadata** ➔ **Access: Read-only** *(sirve para listar tus repositorios)*.
   * **Contents** ➔ **Access: Read and write** *(sirve para ver archivos, historial de commits y ramas)*.
   * **Administration** ➔ **Access: Read and write** *(sirve para crear y eliminar repositorios)*.
8. Pulsa **Generate token** al final de la página.
9. **Copia el token inmediatamente** y guárdalo en un bloc de notas seguro. *No volverá a mostrarse.*

---

### Paso 2: Generar tu Contraseña Segura
Crearemos una firma encriptada de la contraseña que usarás para entrar en la web.

1. Abre la aplicación **PowerShell** en tu ordenador de Windows.
2. Navega hasta la carpeta donde tengas descargado el proyecto:
   ```powershell
   cd "C:\Ruta\A\Tu\Carpeta\De\gerardos-private"
   ```
3. Activa temporalmente la ejecución de scripts locales en esa ventana de PowerShell:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```
4. Ejecuta el script de encriptación sustituyendo `"Gmf162007"` por la contraseña que quieras usar para entrar a tu web en el futuro:
   ```powershell
   .\scripts\generate-hash.ps1 -password "Gmf162007"
   ```
5. El script procesará la contraseña con 600,000 iteraciones y te mostrará en color amarillo un texto largo similar a este:
   `pbkdf2:sha256:600000:sal_hexadecimal:hash_hexadecimal`
6. **Copia esa línea entera** en tu bloc de notas. Será tu clave `PASSWORD_HASH` para Cloudflare.

---

### Paso 3: Desplegar la Web en Cloudflare (Gratis)
Cloudflare Pages nos permite hospedar tanto la interfaz de usuario en `/public` como el servidor backend en `/functions` sin coste alguno y con un subdominio gratis.

1. Regístrate o inicia sesión en el panel oficial de [Cloudflare](https://dash.cloudflare.com/) (es gratuito).
2. En el panel de control de la izquierda, haz clic en **Workers & Pages**.
3. Pulsa el botón **Create** y selecciona la pestaña **Pages**.
4. Haz clic en **Connect to Git** (Conectar a Git).
5. Autoriza el acceso de Cloudflare a tu cuenta de GitHub y selecciona el repositorio privado **`gerardos-private`**.
6. En la pantalla de **Build settings** (Configuración de compilación):
   * **Framework preset**: Déjalo en `None` o `Vite/Static` (no necesitamos framework de compilación).
   * **Build command**: Deja este campo **completamente vacío** (no hay paso de compilación).
   * **Output directory**: Escribe **`public`** (esto le dice a Cloudflare que sirva los archivos estáticos de esa carpeta).
7. Haz clic en el botón **Save and Deploy**. *La primera compilación terminará en segundos.*

---

### Paso 4: Configurar los Secretos y Variables de Entorno
Para que el servidor pueda arrancar, debemos inyectar de forma segura las credenciales que guardamos en nuestro bloc de notas.

1. En el panel del proyecto de Cloudflare Pages, navega a la pestaña de **Settings** (Configuración) en la parte superior.
2. Selecciona **Environment variables** (Variables de entorno) en el menú de la izquierda.
3. Pulsa en **Add variables** e introduce los siguientes 5 campos exactamente igual en las secciones de **Production** y **Preview**:

| Variable (Name) | Valor (Value) | Ejemplo / Explicación |
|:---|:---|:---|
| `GITHUB_PAT` | Tu token de acceso de GitHub | `github_pat_11BXL6L5I...` (obtenido en el Paso 1) |
| `GITHUB_USERNAME` | Tu nombre de usuario de GitHub | `GerardMaestre` |
| `JWT_SECRET` | Una frase larga y compleja de tu elección | `un-secreto-muy-largo-aleatorio-para-firmar-tus-cookies` |
| `PASSWORD_HASH` | El hash de contraseña copiado de PowerShell | `pbkdf2:sha256:600000:sal:hash` (obtenido en el Paso 2) |
| `NODE_ENV` | `production` | Establece el modo de ejecución optimizado del servidor |

4. Pulsa **Save** (Guardar).
5. Para aplicar los cambios, ve a la pestaña de **Deployments**, haz clic en los tres puntos de tu último despliegue y selecciona **Retry deployment** (Reintentar despliegue).

---

## 🎉 ¡Listo para disfrutar!

¡Felicidades! Tu panel de control privado de GitHub ya está totalmente operativo en la nube. 
Puedes acceder a él a través de la dirección gratuita que te proporciona la plataforma, la cual tendrá el formato:
👉 **`https://gerardos-private.pages.dev`**

A partir de ahora, cada vez que entres a la web:
1. Verás una pantalla de bloqueo macOS glassmorphic pidiéndote tu contraseña.
2. Al escribirla correctamente, entrarás a tu dashboard con acceso completo a todos tus repositorios públicos y privados.
3. Podrás cambiar de ramas, explorar código, ver commits y crear/eliminar repositorios de forma segura desde la nube.
