/**
 * Copia embebida de la documentación por si el API no puede leer archivos del monorepo.
 * Los .md del backend viven en frontend/docs/backend (sincronizados con scripts/sync-backend-docs.mjs).
 */
import guiaIds from '../../docs/backend/GUIA_IDENTIFICADORES.md?raw';
import glosario from '../../docs/backend/GLOSARIO_SCHEMAS.md?raw';
import apiIndice from '../../docs/backend/API.md?raw';
import database from '../../docs/backend/DATABASE.md?raw';
import environment from '../../docs/backend/ENVIRONMENT.md?raw';
import integraciones from '../../docs/backend/INTEGRACIONES.md?raw';
import backendReadme from '../../docs/backend/README.md?raw';
import guiaUsuario from '../../docs/GUIA_USUARIO.md?raw';
import desarrolloFrontend from '../../docs/DESARROLLO.md?raw';
import frontendReadme from '../../README.md?raw';

export const BUNDLED_MARKDOWN = {
  'guia-identificadores': { title: 'Guía de IDs y campos', markdown: guiaIds },
  'glosario-schemas': { title: 'Glosario de schemas', markdown: glosario },
  'api-indice': { title: 'Índice de endpoints', markdown: apiIndice },
  database: { title: 'Base de datos', markdown: database },
  environment: { title: 'Variables de entorno', markdown: environment },
  integraciones: { title: 'Integraciones', markdown: integraciones },
  'backend-readme': { title: 'README Backend', markdown: backendReadme },
  'guia-usuario': { title: 'Guía de usuario', markdown: guiaUsuario },
  'desarrollo-frontend': { title: 'Desarrollo frontend', markdown: desarrolloFrontend },
  'frontend-readme': { title: 'README Frontend', markdown: frontendReadme },
};
