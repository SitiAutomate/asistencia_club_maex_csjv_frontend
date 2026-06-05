import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Navigate, useOutletContext } from 'react-router-dom';
import { apiUrl, getJson, getStoredToken } from '../../lib/api.js';
import { BUNDLED_MARKDOWN } from '../../lib/documentationBundled.js';
import {
  DOCUMENTATION_CATALOG,
  groupCatalogItems,
} from '../../lib/documentationCatalog.js';
import '../../styles/documentacion.css';

const INTRO_MD = `
# Centro de documentación — Asistencia Club MAEX

Bienvenido al portal visual de documentación. Aquí encontrará guías del **backend** (API, base de datos, variables) y del **frontend** (uso y desarrollo).

## Accesos rápidos

- **Swagger (API interactiva):** pruebe endpoints con JWT — botón *Abrir Swagger* arriba.
- **Guía de IDs:** primer documento del menú; explica de dónde sale \`ID_Curso\`, documentos, etc.
- **Exportar PDF:** use *Exportar PDF* y en el diálogo del sistema elija *Guardar como PDF*.

## Orden sugerido para probar la API

1. Login → copiar \`accessToken\`
2. GET /api/cursos?correo=...
3. GET /api/inscritos?idCurso=...
4. POST /api/asistencia
`;

function canAccessDocs(rol) {
  const r = String(rol || '').trim();
  return r === 'Desarrollador' || r === 'Administrador';
}

export function DocumentacionPage() {
  const { user } = useOutletContext();
  const printRef = useRef(null);
  const [selectedId, setSelectedId] = useState('intro');

  const catalogQuery = useQuery({
    queryKey: ['docs', 'catalog'],
    queryFn: () => getJson('/api/docs/catalog'),
    enabled: canAccessDocs(user?.rol),
    retry: 1,
  });

  const contentQuery = useQuery({
    queryKey: ['docs', 'content', selectedId],
    queryFn: () => getJson(`/api/docs/content/${selectedId}`),
    enabled: canAccessDocs(user?.rol) && selectedId !== 'intro',
    retry: 1,
  });

  const sidebarItems = useMemo(() => {
    const fromApi = catalogQuery.data?.items;
    if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
    return DOCUMENTATION_CATALOG;
  }, [catalogQuery.data]);

  const itemsByGroup = useMemo(() => groupCatalogItems(sidebarItems), [sidebarItems]);

  const bundled = selectedId !== 'intro' ? BUNDLED_MARKDOWN[selectedId] : null;

  const openSwagger = () => {
    const token = getStoredToken();
    if (!token) return;
    window.open(
      `${apiUrl('/api-docs')}?access_token=${encodeURIComponent(token)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const exportPdf = () => {
    const prev = document.title;
    const title =
      selectedId === 'intro'
        ? 'Documentación — Asistencia Club MAEX'
        : contentQuery.data?.title || bundled?.title || 'Documentación';
    document.title = title;
    window.print();
    document.title = prev;
  };

  if (!canAccessDocs(user?.rol)) {
    return <Navigate to="/" replace />;
  }

  let markdown = INTRO_MD;
  let pageTitle = 'Documentación';
  let contentSource = '';

  if (selectedId !== 'intro') {
    if (contentQuery.data?.markdown) {
      markdown = contentQuery.data.markdown;
      pageTitle = contentQuery.data.title || pageTitle;
      contentSource = 'api';
    } else if (bundled?.markdown) {
      markdown = bundled.markdown;
      pageTitle = bundled.title || pageTitle;
      contentSource = contentQuery.isError ? 'local (API no disponible)' : 'local';
    } else if (contentQuery.isPending) {
      markdown = 'Cargando documento…';
    } else {
      markdown = 'No se pudo cargar este documento.';
    }
  }

  const catalogWarning =
    catalogQuery.isError && !catalogQuery.isPending
      ? 'No se pudo cargar el catálogo desde el servidor; se muestra la lista local.'
      : null;

  return (
    <div className="doc-layout">
      <aside className="doc-sidebar no-print" aria-label="Índice de documentación">
        <button
          type="button"
          className={`doc-sidebar__link ${selectedId === 'intro' ? 'is-active' : ''}`}
          onClick={() => setSelectedId('intro')}
        >
          Inicio
        </button>
        {catalogWarning ? (
          <p className="small text-warning px-2 py-1 mb-0">{catalogWarning}</p>
        ) : null}
        {[...itemsByGroup.entries()].map(([group, items]) => (
          <div key={group}>
            <div className="doc-sidebar__group-title">{group}</div>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`doc-sidebar__link ${selectedId === item.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <div className="doc-main">
        <div className="doc-toolbar no-print">
          <h2 className="doc-toolbar__title">{pageTitle}</h2>
          {String(user?.rol || '').trim() === 'Desarrollador' ? (
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={openSwagger}>
              Abrir Swagger
            </button>
          ) : null}
          <button type="button" className="btn btn-primary btn-sm" onClick={exportPdf}>
            Exportar PDF
          </button>
        </div>

        {selectedId === 'intro' ? (
          <div className="doc-intro-card no-print">
            <p className="mb-0 small text-muted">
              Sección <strong>Frontend</strong>: guía de usuario y desarrollo del SPA. Sección{' '}
              <strong>Backend</strong>: API, base de datos e integraciones. Los archivos .md del
              repositorio se leen desde el API o, si falla, desde copia embebida en el build.
            </p>
          </div>
        ) : null}

        {contentSource === 'local (API no disponible)' ? (
          <div className="alert alert-warning py-2 small no-print" role="status">
            Mostrando copia embebida. Reinicie el backend o revise permisos en{' '}
            <code>/api/docs/content/{selectedId}</code>.
          </div>
        ) : null}

        {contentQuery.isError && !bundled?.markdown && selectedId !== 'intro' ? (
          <div className="alert alert-danger py-2 small no-print" role="alert">
            {contentQuery.error?.message || 'Error al cargar el documento.'}
          </div>
        ) : null}

        <article ref={printRef} className="doc-content doc-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
