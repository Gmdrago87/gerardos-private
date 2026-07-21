# Configuración para Cloudflare Pages - GerardOS Private

## Configuración Básica

### 1. Configuración del Proyecto en Cloudflare Pages

- **Nombre del proyecto**: `gerardos-private`
- **Repositorio**: `Gmdrago87/gerardos-private`
- **Branch de producción**: `main`

### 2. Configuración del Build

| Campo | Valor |
|-------|-------|
| **Framework preset** | None |
| **Build command** | `npm run build:all` |
| **Build output directory** | `public` |
| **Root directory** | (dejar vacío) |

### 3. Variables de Entorno (Environment Variables)

Estas variables **DEBEN** configurarse en Cloudflare Pages > Settings > Environment variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | Client ID de tu GitHub OAuth App | `Iv1.XXXXXXXXXXXXXXXX` |
| `GITHUB_CLIENT_SECRET` | Client Secret de tu GitHub OAuth App | `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `JWT_SECRET` | Secreto para firmar JWTs (mínimo 32 caracteres) | `tu_super_secreto_seguro_aqui` |
| `GITHUB_USERNAME` | Usuario(s) de GitHub autorizado(s) | `Gmdrago87,GerardMaestre` |
| `NODE_ENV` | Entorno de ejecución | `production` |

### 4. Configuración de la GitHub OAuth App

1. Ve a [GitHub Developer Settings](https://github.com/settings/developers)
2. Crea una nueva OAuth App:
   - **Application name**: `GerardOS Private`
   - **Homepage URL**: `https://gerardos-private.pages.dev` (o tu dominio personalizado)
   - **Authorization callback URL**: `https://gerardos-private.pages.dev/api/oauth/callback`
3. Copia el **Client ID** y genera un **Client Secret**

### 5. Configuración Adicional Opcional

#### KV Namespace para Cache (Opcional)

Si quieres habilitar cache persistente:

1. Crea un KV namespace en Cloudflare
2. Descomenta y configura en `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "tu-id-de-kv-aqui"
```

3. Añade la variable de entorno en Cloudflare Pages:
   - `CACHE_KV`: (el ID del namespace)

## Verificación Pre-Despliegue

Antes de desplegar, verifica:

1. ✅ No hay secretos hardcodeados en el código
2. ✅ Todas las variables de entorno están configuradas
3. ✅ La GitHub OAuth App tiene las URLs correctas
4. ✅ El build se ejecuta correctamente localmente (`npm run build:all`)
5. ✅ Los workflows de GitHub Actions pasan

## Despliegue

1. **Despliegue automático**: Cada push a `main` desencadenará un despliegue automático
2. **Despliegue manual**: Puedes forzar un despliegue desde el panel de Cloudflare Pages

## Monitoreo

- **Logs**: Disponibles en Cloudflare Pages > Logs
- **Métricas**: Disponibles en Cloudflare Dashboard
- **CI/CD**: GitHub Actions > Actions

## Solución de Problemas

### Error: "Falta GITHUB_CLIENT_ID"
**Solución**: Verifica que la variable de entorno `GITHUB_CLIENT_ID` esté configurada correctamente en Cloudflare Pages.

### Error: "Acceso Denegado"
**Solución**: Verifica que:
1. El usuario de GitHub esté en la lista `GITHUB_USERNAME`
2. La GitHub OAuth App tenga los permisos correctos (`repo`, `user`)

### Error: "El servidor no está configurado correctamente"
**Solución**: Verifica que todas las variables de entorno estén configuradas:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `JWT_SECRET`
- `GITHUB_USERNAME`
- `NODE_ENV=production`

### Build falla en GitHub Actions
**Solución**: 
1. Verifica que el workflow tenga permisos para ejecutarse
2. Revisa los logs del workflow en GitHub Actions
3. Ejecuta `npm run build:all` localmente para identificar el problema

## Seguridad

### Recomendaciones

1. **JWT_SECRET**: Usa un secreto fuerte de al menos 32 caracteres aleatorios
2. **GitHub OAuth App**: No compartas el Client Secret
3. **Variables de entorno**: Nunca las comitas en el repositorio
4. **Rate Limiting**: Ya está configurado en el código
5. **CSP**: Content Security Policy ya está configurada

### Escaneo de Secretos

El repositorio incluye:
- `.gitleaks.toml`: Configuración para escaneo de secretos
- Workflow de seguridad en GitHub Actions que se ejecuta diariamente

Para escanear manualmente:
```bash
# Instalar gitleaks
docker run -v $(pwd):/path zricethezav/gitleaks:latest detect --source="/path" -v

# O usar el workflow de GitHub Actions
```

## Actualizaciones

Para actualizar el proyecto:

1. Haz pull de los últimos cambios
2. Actualiza las dependencias: `npm update`
3. Verifica que el build funcione: `npm run build:all`
4. Haz push a `main` para desplegar

## Contacto

Si tienes problemas, abre un issue en el repositorio:
https://github.com/Gmdrago87/gerardos-private/issues
