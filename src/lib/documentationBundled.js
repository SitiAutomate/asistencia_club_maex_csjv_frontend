/**
 * Copia embebida de la documentación por si el API no puede leer archivos del monorepo.
 */
import guiaIds from '../../../backend/docs/GUIA_IDENTIFICADORES.md?raw';
import glosario from '../../../backend/docs/GLOSARIO_SCHEMAS.md?raw';
import apiIndice from '../../../backend/docs/API.md?raw';
import database from '../../../backend/docs/DATABASE.md?raw';
import environment from '../../../backend/docs/ENVIRONMENT.md?raw';
import integraciones from '../../../backend/docs/INTEGRACIONES.md?raw';
import backendReadme from '../../../backend/README.md?raw';
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
