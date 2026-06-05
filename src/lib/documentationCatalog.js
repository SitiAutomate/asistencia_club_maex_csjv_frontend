/** Catálogo local (mismo ids que backend/docs). El menú no depende solo del API. */
export const DOCUMENTATION_CATALOG = [
  { id: 'guia-identificadores', title: 'Guía de IDs y campos', group: 'Referencia API' },
  { id: 'glosario-schemas', title: 'Glosario de schemas', group: 'Referencia API' },
  { id: 'api-indice', title: 'Índice de endpoints', group: 'Backend' },
  { id: 'database', title: 'Base de datos', group: 'Backend' },
  { id: 'environment', title: 'Variables de entorno', group: 'Backend' },
  { id: 'integraciones', title: 'Integraciones', group: 'Backend' },
  { id: 'backend-readme', title: 'README Backend', group: 'Backend' },
  { id: 'guia-usuario', title: 'Guía de usuario', group: 'Frontend' },
  { id: 'desarrollo-frontend', title: 'Desarrollo frontend', group: 'Frontend' },
  { id: 'frontend-readme', title: 'README Frontend', group: 'Frontend' },
];

export function groupCatalogItems(items = DOCUMENTATION_CATALOG) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group).push(item);
  }
  return map;
}
