# Frontend — Asistencia Club MAEX

Aplicación web (SPA) para registro de asistencia, consulta de participantes, rúbricas, evaluaciones e informes del club.

**Repositorio GitHub:** [asistencia_club_maex_csjv_frontend](https://github.com/SitiAutomate/asistencia_club_maex_csjv_frontend)

## Stack

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19 | UI |
| Vite | 8 | Build y dev server |
| React Router | 7 | Rutas y layouts |
| TanStack Query | 5 | Datos del servidor |
| Bootstrap | 5 | Componentes base |
| Sass | 1.x | Estilos del tema club |

No se usa Axios: las peticiones van por `fetch` en `src/lib/api.js`.

## Requisitos

- Node.js 20+
- Backend API en ejecución (ver [repositorio backend](https://github.com/SitiAutomate/asistencia_club_maex_csjv_backend))

## Instalación

```bash
git clone https://github.com/SitiAutomate/asistencia_club_maex_csjv_frontend.git
cd asistencia_club_maex_csjv_frontend
npm install
cp .env.example .env
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 5173) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Vista previa del build |
| `npm run lint` | ESLint |
| `npm run lint:css` | Stylelint en CSS |

## Variables de entorno (`VITE_*`)

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL base del API. **Vacío en dev:** el proxy de Vite envía `/api` a `localhost:3006` |
| `VITE_MICROSOFT_REDIRECT_URI` | Debe coincidir con Azure y con el backend |
| `VITE_VIEW_ASISTENCIA` | Mostrar menú Asistencia (`true`/`false`) |
| `VITE_VIEW_HISTORIAL` | Historial |
| `VITE_VIEW_INFORMACION` | Información |
| `VITE_VIEW_RUBRICAS` | Rúbricas |
| `VITE_VIEW_REPORTES` | Reportes |
| `VITE_VIEW_ADMINISTRADOR` | Panel admin |
| `VITE_SUPPORT_WHATSAPP` | Número para soporte en pantalla Asistencia |
| `VITE_BRANDING_VERSION` | Cache-bust del logo |
## Proxy en desarrollo

En `vite.config.js`, las peticiones a `/api` y `/uploads` se redirigen a `http://localhost:3006`.

## Estructura

```txt
src/
  App.jsx              # Rutas
  main.jsx
  components/
    layout/            # AppShell, RequireAuth
    asistencia/        # Tarjetas, modales
  pages/
    auth/              # Login, registro, Microsoft
    asistencia/        # Pantallas principales
  lib/
    api.js             # Cliente HTTP + token
    navFeatures.js     # Flags de menú
  providers/
  styles/
docs/
  GUIA_USUARIO.md
  DESARROLLO.md
  CSS_STACKING.md
```

## Documentación

- [Guía de usuario](docs/GUIA_USUARIO.md) — uso por rol y pantalla
- [Guía de desarrollo](docs/DESARROLLO.md) — rutas, auth, API
- [CSS stacking](docs/CSS_STACKING.md) — z-index y modales

## Documentación visual

Roles **Desarrollador** y **Administrador** tienen el menú **Documentación** (`/documentacion`):

- Lee los `.md` oficiales del backend y frontend desde el API.
- **Exportar PDF** (impresión del navegador → Guardar como PDF).
- Desarrolladores: botón **Abrir Swagger** para probar endpoints.

Guías clave en el portal: *Guía de IDs y campos*, *Glosario de schemas*.

## Rol Desarrollador

Usuarios con rol **Desarrollador** (creados en la BD del backend) inician sesión en la pestaña **Proveedor** (correo y contraseña).
