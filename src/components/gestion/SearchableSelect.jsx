import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';
import { GestionSearchInput } from './GestionSearchInput.jsx';

/**
 * Select con buscador (lista filtrable).
 * options: [{ value, label, searchText? }]
 * onSearchChange: opcional, para filtrado remoto (p. ej. API).
 * El menú se renderiza en portal (fixed) para no quedar recortado en modales con scroll.
 */
export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccione…',
  disabled = false,
  allowClear = true,
  className = '',
  onSearchChange,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value ?? '')),
    [options, value],
  );

  const filtered = useMemo(() => {
    if (typeof onSearchChange === 'function') return options;
    const nq = normalizeForSearch(q);
    if (!nq) return options;
    return options.filter((o) =>
      normalizeForSearch(`${o.label || ''} ${o.searchText || ''} ${o.value || ''}`).includes(nq),
    );
  }, [options, q, onSearchChange]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const maxH = 260;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < Math.min(maxH, 180) && spaceAbove > spaceBelow;
    const height = Math.min(maxH, openUp ? spaceAbove : spaceBelow);
    const width = Math.max(rect.width, Math.min(420, window.innerWidth - 16));
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);

    setMenuStyle({
      position: 'fixed',
      zIndex: 2000,
      left,
      width,
      maxHeight: Math.max(120, height),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap, top: 'auto' }
        : { top: rect.bottom + gap, bottom: 'auto' }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, filtered.length, q]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const inRoot = rootRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inRoot && !inMenu) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const handleQuery = (next) => {
    setQ(next);
    onSearchChange?.(next);
  };

  const dropdown = open && menuStyle ? (
    <div
      ref={menuRef}
      className="att-search-select__dropdown att-search-select__dropdown--portal"
      style={menuStyle}
    >
      <GestionSearchInput
        placeholder="Buscar…"
        value={q}
        autoFocus
        onChange={(e) => handleQuery(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="att-search-select__list" style={{ maxHeight: `calc(${menuStyle.maxHeight}px - 2.75rem)` }}>
        {allowClear ? (
          <button
            type="button"
            className={`att-search-select__option ${!value ? 'is-selected' : ''}`}
            onClick={() => {
              onChange('');
              setOpen(false);
              handleQuery('');
            }}
          >
            {placeholder}
          </button>
        ) : null}
        {filtered.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className={`att-search-select__option ${String(o.value) === String(value) ? 'is-selected' : ''}`}
            onClick={() => {
              onChange(o.value, o);
              setOpen(false);
              handleQuery('');
            }}
          >
            {o.label}
          </button>
        ))}
        {filtered.length === 0 ? (
          <div className="small text-muted px-2 py-2">Sin resultados</div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`att-search-select ${open ? 'is-open' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="form-select form-select-sm att-search-select__trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={!selected ? 'text-muted' : ''}>
          {selected?.label || placeholder}
        </span>
      </button>
      {dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
