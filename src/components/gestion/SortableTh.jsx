/**
 * Encabezado ordenable con asa de redimensionado (arrastrar borde derecho).
 */
export function SortableTh({
  label,
  column,
  sort,
  dir,
  onSort,
  className,
  style,
  width,
  onResizeStart,
  resizable = true,
}) {
  const active = sort === column;
  const nextDir = active && dir === 'asc' ? 'desc' : 'asc';
  const mergedStyle =
    width != null
      ? { ...style, width, minWidth: width, maxWidth: width }
      : style;

  return (
    <th
      className={['att-gestion-th-resizable', className].filter(Boolean).join(' ') || undefined}
      style={mergedStyle}
      aria-sort={active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      <button
        type="button"
        className={`att-sort-th ${active ? 'is-active' : ''}`}
        onClick={() => onSort(column)}
        title={`Ordenar por ${label} (${nextDir === 'desc' ? 'descendente' : 'ascendente'})`}
      >
        <span>{label}</span>
        <span className="att-sort-th__ind" aria-hidden="true">
          {active ? (dir === 'desc' ? '↓' : '↑') : '↕'}
        </span>
      </button>
      {resizable && onResizeStart ? (
        <span
          className="att-gestion-col-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label={`Redimensionar columna ${label}`}
          title="Arrastrar para cambiar el ancho"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(column, e);
          }}
        />
      ) : null}
    </th>
  );
}

export function toggleColumnSort(current, column) {
  if (current?.sort === column) {
    return { sort: column, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { sort: column, dir: 'asc' };
}

export function sortRows(rows, sort, dir, valueOf) {
  if (!sort || !rows?.length) return rows || [];
  const mul = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = valueOf(a, sort);
    const bv = valueOf(b, sort);
    const aEmpty = av == null || av === '';
    const bEmpty = bv == null || bv === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul;
    return String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' }) * mul;
  });
}
