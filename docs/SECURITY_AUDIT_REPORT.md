# Informe de Auditoría y Remediación — GerardOS Private

## Resumen ejecutivo

Se ejecutó una auditoría estática de seguridad con subagentes especializados sobre backend serverless, endpoints de repositorios y frontend. La revisión identificó riesgos en validación de entradas, controles CSRF/origen, CSP, cachés del navegador, manipulación DOM y manejo de errores upstream.

Este informe documenta las mejoras aplicadas en esta iteración. Quedan como recomendaciones futuras el cambio a sesiones opacas con almacenamiento server-side para no transportar el token OAuth dentro del JWT y la migración completa a una CSP sin `unsafe-inline`.

## Mejoras aplicadas

| Área | Mejora |
| --- | --- |
| Validación compartida | Se añadieron helpers para respuestas JSON, lectura JSON con límite de tamaño, validación de repositorios, ramas, rutas de archivo y SHA. |
| Middleware API | Se añadió verificación de usuario esperado en el JWT y bloqueo de métodos mutantes con origen no confiable. |
| JWT | `exp`, `iat` y `sub` pasan a ser claims obligatorios y validados. |
| OAuth/logout | Se endurecieron ramas de error de GitHub OAuth y se alinea el borrado de cookies con atributos seguros. |
| Endpoints repos | Se unificó `requireAuth`, se validan `repoName`, `branch`, `path`, `sha`, `page`, `labels`, `state` e `issue_number`, y se eliminan detalles crudos de GitHub en respuestas al cliente. |
| Frontend | Se codifican nombres de repositorio al construir rutas API, se evita XSS en selector de ramas y errores de visor, y la preview queda aislada en iframe sandbox con CSP interna. |
| Caché | Logout y sesión inválida limpian caché local e IndexedDB privada; el service worker usa allowlist estricta y `_headers` evita cachear por un año assets sin fingerprint. |
| Cabeceras | Se elimina `unsafe-eval`, se añade `Permissions-Policy`, `base-uri`, `object-src`, `form-action` y `upgrade-insecure-requests`, y se desactiva `X-XSS-Protection`. |

## Hallazgos cerrados o mitigados

1. Validación inconsistente de `repoName` en endpoints de ramas, commits e issues.
2. `issue_number` aceptaba valores parcialmente numéricos y podía manipular la ruta upstream.
3. Validación frágil de rutas de archivo basada en `includes("..")`.
4. Endpoints mutantes dependían solo de `SameSite=Strict`; ahora hay control de origen en middleware.
5. Respuestas con detalles crudos de errores GitHub en creación, eliminación y actualización de repositorios.
6. Parámetros `page`, `branch`, `message`, `content`, `labels`, `state` y `sha` sin contrato estricto.
7. Frontend interpolaba `repoName` sin `encodeURIComponent()` en rutas API.
8. Selector de ramas renderizado con `innerHTML` e interpolación directa.
9. `showViewerError()` podía convertir mensajes futuros no confiables en HTML.
10. Preview ejecutaba HTML/CSS/JS de repositorios sin aislamiento suficiente.
11. Service worker cacheaba cualquier GET no API del sitio.
12. `_headers` marcaba todos los assets como `immutable` durante un año.
13. JWT aceptaba tokens firmados sin `exp` y sin claims mínimos.
14. CSP permitía `unsafe-eval` y carecía de directivas de endurecimiento adicionales.

## Riesgos pendientes recomendados

- Migrar de JWT con `github_token` a sesión opaca revocable con token OAuth almacenado server-side en KV/D1/Durable Object y TTL.
- Implementar CSRF double-submit token además del control de origen para endpoints mutantes.
- Eliminar scripts/handlers inline restantes para poder quitar `unsafe-inline` de `script-src`.
- Vendorizar o fijar con SRI las dependencias de CDN.
- Añadir pruebas automatizadas para validadores, middleware, endpoints mutantes y sinks DOM.
