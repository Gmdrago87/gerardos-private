# 🔒 Guía Completa de GerardOS Private — Tu Clon Privado de GitHub

Bienvenido al manual oficial de **GerardOS Private**. Este documento detalla la filosofía del proyecto, su arquitectura de seguridad y los pasos exactos que debes seguir para desplegar tu panel de control privado de forma 100% gratuita en la nube.

---

## 💡 La Idea del Proyecto

**GerardOS Private** es una plataforma personal, interactiva y protegida que funciona como un sistema operativo web (inspirado en la interfaz de escritorio de macOS) para gestionar, explorar y auditar **todos tus repositorios públicos y privados de GitHub** desde cualquier navegador del mundo sin comprometer la seguridad de tu cuenta.

---

## 🛡️ Arquitectura de Seguridad (Modelo OAuth & Serverless)

El sistema ha sido diseñado para ser **inquebrantable** frente a ataques web habituales:

1. **Autenticación Delegada (GitHub OAuth)**: El login se delega completamente al flujo seguro de GitHub OAuth. No se almacenan ni procesan contraseñas en el servidor.
2. **Protección Anti-CSRF (State Token)**: Cada petición de autenticación genera un token criptográfico `state` único guardado en cookies seguras para evitar ataques de falsificación de peticiones.
3. **Control de Acceso Estricto (Propietario Único)**: Solo la cuenta configurada en `GITHUB_USERNAME` podrá acceder tras autenticarse en GitHub. Cualquier otro usuario será rechazado con un error `403 Forbidden`.
4. **Autenticación sin Estado (JWT)**: Tras el login exitoso, el servidor emite un JSON Web Token firmado con HMAC-SHA256 usando Web Crypto API.
5. **Cookies de Seguridad Máxima**: El JWT se guarda en una cookie con `HttpOnly` (inaccesible desde JavaScript), `Secure` (solo tráfico encriptado HTTPS) y `SameSite=Strict` (máxima protección contra CSRF).
6. **Token de GitHub Oculto**: El access token de GitHub reside de forma segura en las variables de entorno de la función serverless de Cloudflare, **nunca en el cliente**.
7. **Políticas de Seguridad en el Navegador (CSP)**: Restringe estrictamente qué scripts, fuentes e imágenes pueden ejecutarse o cargarse, bloqueando XSS e inserción en iFrames ajenos.
8. **Prevención de Path Traversal**: Las APIs de lectura y modificación de archivos bloquean intentos de navegación en el sistema de archivos (`..` o `\0`).

---

## 📁 Estructura del Repositorio

*   `/public`: Archivos estáticos de la interfaz de usuario (HTML, CSS de vidrio líquido, controladores de eventos en JS).
*   `/functions`: El servidor backend que corre en Cloudflare Pages Functions (Serverless).

---

## 🚀 Guía de Configuración Paso a Paso

### Paso 1: Crear una GitHub OAuth App
1. Ve a tu cuenta de GitHub → **Settings** → **Developer Settings** → **OAuth Apps**.
2. Haz clic en **Register a new application**.
3. Rellena el formulario:
   * **Application Name**: `GerardOS Private Dashboard`
   * **Homepage URL**: `https://gerardos-private.pages.dev` (o `http://localhost:8789` si estás probando localmente).
   * **Authorization callback URL**: `https://gerardos-private.pages.dev/api/oauth/callback` (o `http://localhost:8789/api/oauth/callback`).
4. Haz clic en **Register application**.
5. Guarda el **Client ID** y genera un **Client Secret** (cópialo en un lugar seguro).

---

### Paso 2: Desplegar la Web en Cloudflare Pages
1. Entra a [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Selecciona tu repositorio privado **`gerardos-private`**.
3. Configuración de Build:
   * **Framework preset**: `None`
   * **Build command**: *(Dejar en blanco)*
   * **Output directory**: `public`
4. Pulsa **Save and Deploy**.

---

### Paso 3: Configurar las Variables de Entorno
En Cloudflare Pages → **Settings** → **Environment variables**, añade en **Production** y **Preview**:

| Variable | Descripción |
|:---|:---|
| `GITHUB_CLIENT_ID` | El Client ID generado en tu GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | El Client Secret generado en tu GitHub OAuth App |
| `GITHUB_USERNAME` | Tu nombre de usuario exacto en GitHub (ej. `GerardMaestre`) |
| `JWT_SECRET` | Una frase larga y aleatoria para firmar tus cookies de sesión |
| `NODE_ENV` | `production` |

---

## 🎉 ¡Listo para disfrutar!

Accede a tu panel en `https://gerardos-private.pages.dev`. Al hacer clic en Iniciar Sesión, serás redirigido a GitHub para autorizar el acceso y entrarás a tu entorno privado de macOS de forma 100% segura.
