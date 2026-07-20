# Plan de Auditoría Completo — GerardOS Private

## 1. Objetivo y alcance

Este plan define una auditoría integral para **GerardOS Private**, una aplicación web privada desplegable en Cloudflare Pages + Functions que permite autenticar con GitHub OAuth, explorar repositorios públicos/privados y ejecutar acciones sobre repositorios desde un panel personal.

La auditoría cubre:

- Seguridad de autenticación, autorización, sesiones y cookies.
- Protección de APIs serverless en Cloudflare Pages Functions.
- Uso seguro de GitHub OAuth y de la API de GitHub.
- Seguridad del frontend, cabeceras, CSP, XSS, CSRF y exposición de secretos.
- Validación de entradas, rutas dinámicas, path traversal y manejo de errores.
- Dependencias, configuración, despliegue, observabilidad y operación.
- Privacidad, cumplimiento básico y resiliencia operativa.

## 2. Principios de la auditoría

- **Mínimo privilegio:** validar que cada token, cookie, permiso OAuth y endpoint tenga solo los privilegios necesarios.
- **Defensa en profundidad:** comprobar controles superpuestos en cliente, funciones serverless, cookies, cabeceras y GitHub.
- **Trazabilidad:** documentar cada hallazgo con evidencia, impacto, probabilidad, severidad y remediación.
- **Reproducibilidad:** registrar comandos, herramientas, versión del código, fecha y entorno usados.
- **No destructivo por defecto:** evitar pruebas que eliminen repositorios, ramas o archivos sin autorización explícita.

## 3. Roles y responsabilidades

| Rol | Responsabilidad |
| --- | --- |
| Propietario del sistema | Autorizar alcance, aprobar pruebas destructivas y priorizar remediaciones. |
| Auditor técnico | Ejecutar pruebas, recopilar evidencias y proponer correcciones. |
| Desarrollador | Implementar remediaciones, añadir pruebas y actualizar documentación. |
| Revisor independiente | Validar cierres de hallazgos críticos y altos. |

## 4. Inventario inicial

Antes de probar, recopilar y versionar el inventario:

1. Commit exacto auditado (`git rev-parse HEAD`).
2. Variables de entorno requeridas en producción y preview.
3. Configuración de GitHub OAuth App: callback URL, homepage, scopes y propietario.
4. Configuración de Cloudflare Pages: dominio, funciones, variables, logs y ramas desplegadas.
5. Endpoints expuestos bajo `/api/*`.
6. Archivos estáticos públicos y service worker.
7. Dependencias declaradas en `package.json` y `package-lock.json`.

## 5. Metodología por fases

### Fase 0 — Preparación

- Confirmar autorización escrita, alcance y ventanas de prueba.
- Crear entorno de preview con repositorios de prueba.
- Preparar cuenta GitHub autorizada y cuenta no autorizada para pruebas de control de acceso.
- Generar datos de prueba: repositorios públicos, privados, ramas, issues y archivos con nombres límite.
- Definir matriz de severidad: Crítica, Alta, Media, Baja e Informativa.

### Fase 1 — Revisión documental y arquitectura

- Revisar README, instrucciones de despliegue y diagramar el flujo completo OAuth → JWT → API GitHub.
- Identificar fronteras de confianza: navegador, Cloudflare Functions, GitHub OAuth, GitHub API y cookies.
- Confirmar que el token de GitHub nunca se expone al frontend.
- Verificar que la sesión local expira y que el cierre de sesión invalida cookies.
- Documentar amenazas usando STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service y elevation of privilege.

### Fase 2 — Autenticación OAuth y sesiones

Pruebas obligatorias:

- Iniciar sesión con el usuario autorizado y verificar redirección correcta.
- Intentar iniciar sesión con un usuario distinto al configurado en `GITHUB_USERNAME` y esperar `403`.
- Reutilizar un `code` OAuth y comprobar rechazo.
- Enviar callback sin `code`, sin `state`, con `state` alterado y con cookie `oauth_state` ausente.
- Verificar atributos de cookie de sesión: `HttpOnly`, `Secure` en HTTPS, `SameSite=Strict`, `Path=/` y `Max-Age` esperado.
- Confirmar que `oauth_state` se elimina tras el callback exitoso.
- Probar expiración del JWT y rechazo posterior por la API.
- Validar que tokens antiguos o sin `github_token` sean rechazados.

Evidencias esperadas: capturas de cabeceras `Set-Cookie`, códigos HTTP y logs sanitizados sin secretos.

### Fase 3 — Autorización y control de acceso API

Para cada endpoint privado bajo `/api/repos/*`:

- Llamar sin cookie de sesión y esperar `401`.
- Llamar con JWT inválido, expirado o firmado con secreto incorrecto y esperar `401`.
- Llamar con usuario autorizado y verificar que solo accede a repositorios del propietario configurado.
- Intentar acceder a repositorios inexistentes, de terceros y nombres con caracteres límite.
- Validar que las respuestas no filtran tokens, secretos ni trazas internas.

### Fase 4 — Validación de entradas y path traversal

Probar rutas y parámetros con:

- `../`, `..%2f`, `%2e%2e/`, doble codificación, barras invertidas, bytes nulos y rutas absolutas.
- Nombres de repositorio con espacios, unicode, barras, dos puntos y caracteres de shell.
- Ramas con caracteres especiales y nombres largos.
- Rutas de archivo profundas, archivos binarios y archivos grandes.

Criterio de éxito: rechazo seguro, errores JSON consistentes y ausencia de acceso fuera del recurso previsto.

### Fase 5 — Seguridad del frontend

- Revisar todos los puntos donde se renderiza contenido de repositorios, issues, commits, ramas y errores.
- Comprobar que se usa escape/serialización segura y no `innerHTML` con contenido no confiable salvo sanitización robusta.
- Ejecutar payloads XSS en nombres de repositorio, issues, mensajes de commit, ramas y contenido de archivos.
- Validar que el service worker no cachea respuestas privadas de API ni contenido sensible.
- Revisar manejo de errores en UI para evitar fuga de stack traces o tokens.
- Verificar accesibilidad básica de flujos críticos: login, logout, exploración y acciones destructivas.

### Fase 6 — Cabeceras y políticas de navegador

Validar en producción y preview:

- `Content-Security-Policy` restrictiva y compatible con los scripts usados.
- `Strict-Transport-Security` en HTTPS.
- `X-Frame-Options` o `frame-ancestors` para evitar clickjacking.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy` conservadora.
- `Permissions-Policy` mínima.
- No cache para `/api/*` y no almacenamiento de datos privados en cachés compartidas.

### Fase 7 — Gestión de secretos y configuración

- Confirmar que `.env`, tokens OAuth, JWT secrets y claves no están versionados.
- Revisar historial Git con herramientas de secret scanning.
- Verificar que `JWT_SECRET` tiene longitud y entropía suficientes.
- Confirmar separación de variables entre Production y Preview.
- Validar rotación documentada de `GITHUB_CLIENT_SECRET` y `JWT_SECRET`.
- Comprobar que los logs no imprimen tokens OAuth, JWT completos ni cookies.

### Fase 8 — Dependencias y cadena de suministro

- Ejecutar `npm audit` y revisar severidades.
- Revisar `package-lock.json` y dependencias transitivas.
- Confirmar que no se cargan scripts remotos no controlados salvo dominios explícitamente autorizados.
- Evaluar integridad de CDN si se usan recursos externos.
- Añadir política de actualización periódica de dependencias.

### Fase 9 — Pruebas dinámicas y abuso

- Ejecutar pruebas con navegador real en entorno preview.
- Realizar fuzzing moderado de parámetros de endpoints.
- Probar límites de tasa frente a GitHub API y manejo de `403 rate limit`.
- Validar timeouts, errores de red y respuestas malformadas de GitHub.
- Confirmar que acciones destructivas requieren confirmación y muestran el repositorio objetivo claramente.

### Fase 10 — Privacidad y cumplimiento básico

- Identificar datos personales tratados: usuario GitHub, repositorios, issues, commits y tokens.
- Confirmar que no se persisten datos personales fuera de GitHub y cookies de sesión.
- Documentar finalidad, retención y mecanismo de eliminación de sesión.
- Verificar que los scopes OAuth solicitados son los mínimos necesarios para repositorios privados y acciones requeridas.

### Fase 11 — Resiliencia operativa

- Revisar comportamiento cuando GitHub está caído o responde lento.
- Revisar comportamiento cuando faltan variables de entorno.
- Validar que los errores 4xx/5xx son claros para el usuario y útiles para soporte sin filtrar secretos.
- Comprobar que el despliegue puede revertirse a una versión anterior.
- Definir métricas mínimas: errores de OAuth, errores 401/403, errores GitHub API y latencia de endpoints.

## 6. Herramientas recomendadas

| Categoría | Herramientas |
| --- | --- |
| Revisión estática | ESLint, `npm audit`, revisión manual, secret scanning. |
| Pruebas HTTP | curl, HTTPie, Bruno/Postman, OWASP ZAP baseline. |
| Navegador | DevTools, Lighthouse, Playwright para flujos críticos. |
| Seguridad web | OWASP ASVS, OWASP Top 10, STRIDE. |
| GitHub | GitHub OAuth App settings, GitHub token scopes, audit logs si aplica. |
| Cloudflare | Pages deployment logs, Functions logs, reglas de cabecera y variables. |

## 7. Checklist de evidencias

Cada hallazgo debe incluir:

- Identificador único.
- Severidad y justificación.
- Componente afectado.
- Pasos de reproducción.
- Resultado esperado y resultado observado.
- Evidencia: comando, captura, cabecera o log sanitizado.
- Impacto técnico y de negocio.
- Recomendación concreta.
- Estado: abierto, mitigado, aceptado o cerrado.

## 8. Matriz de severidad

| Severidad | Criterio |
| --- | --- |
| Crítica | Exposición de token, bypass de autenticación, acceso a repositorios privados de terceros o ejecución remota. |
| Alta | XSS explotable, CSRF en acción sensible, path traversal real, cookie insegura en producción. |
| Media | Fuga parcial de información, validación incompleta, errores operativos que degradan seguridad. |
| Baja | Endurecimiento de cabeceras, mensajes mejorables, problemas menores de UX segura. |
| Informativa | Buenas prácticas, documentación o mejoras preventivas sin impacto inmediato. |

## 9. Cronograma sugerido

| Día | Actividad | Entregable |
| --- | --- | --- |
| 1 | Preparación, inventario y arquitectura | Inventario y diagrama de flujo. |
| 2 | OAuth, sesiones y autorización | Evidencias de autenticación y control de acceso. |
| 3 | Validación de entradas, frontend y cabeceras | Resultados XSS, traversal y políticas de navegador. |
| 4 | Dependencias, secretos, resiliencia y privacidad | Reportes de herramientas y checklist operativo. |
| 5 | Informe final y plan de remediación | Informe ejecutivo, backlog priorizado y criterios de cierre. |

## 10. Criterios de aceptación

La auditoría se considera completa cuando:

- Todos los endpoints públicos y privados están clasificados y probados.
- Los flujos OAuth exitosos y fallidos tienen evidencia.
- Se han probado controles de CSRF, cookies, JWT, XSS y path traversal.
- Se ha ejecutado análisis de dependencias y revisión de secretos.
- Cada hallazgo tiene severidad, impacto, reproducción y remediación.
- Los hallazgos críticos y altos tienen corrección, mitigación temporal o aceptación explícita del riesgo.

## 11. Entregables finales

1. Informe ejecutivo para decisión de riesgo.
2. Informe técnico con evidencias reproducibles.
3. Backlog priorizado de remediaciones.
4. Checklist de configuración segura para producción.
5. Registro de riesgos aceptados.
6. Recomendaciones de monitoreo y mantenimiento trimestral.
