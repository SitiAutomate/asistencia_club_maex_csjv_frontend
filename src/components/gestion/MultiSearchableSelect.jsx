import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';
import { GestionSearchInput } from './GestionSearchInput.jsx';

/**
 * Select múltiple con buscador.
 * value: string[] | ''
 * onChange: (string[]) => void
 */
export function MultiSearchableSelect({
  value = [],
  onChange,
  options = [],
  placeholder = 'Seleccione…',
  disabled = false,
  className = '',
  onSearchChange,
}) {
  const selectedValues = useMemo(
    () => (Array.isArray(value) ? value.map(String).filter(Boolean) : value ? [String(value)] : []),
    [value],
  );
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [String(o.value), o.label]));
    return selectedValues.map((v) => map.get(v) || v);
  }, [options, selectedValues]);

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
    const maxH = 280;
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
      maxHeight: Math.max(140, height),
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
  }, [open, filtered.length, q, selectedValues.length]);

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

  const toggle = (val) => {
    const v = String(val);
    const next = selectedValues.includes(v)
      ? selectedValues.filter((x) => x !== v)
      : [...selectedValues, v];
    onChange(next);
  };

  const triggerText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`;

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
        onChange={(e) => {
          setQ(e.target.value);
          onSearchChange?.(e.target.value);
        }}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="d-flex gap-2 mb-2 px-1">
        <button
          type="button"
          className="btn btn-link btn-sm p-0"
          onClick={() => onChange([])}
          disabled={!selectedValues.length}
        >
          Limpiar
        </button>
      </div>
      <div className="att-search-select__list" style={{ maxHeight: `calc(${menuStyle.maxHeight}px - 4.5rem)` }}>
        {filtered.map((o) => {
          const checked = selectedValues.includes(String(o.value));
          return (
            <button
              key={String(o.value)}
              type="button"
              className={`att-search-select__option ${checked ? 'is-selected' : ''}`}
              onClick={() => toggle(o.value)}
            >
              <span className="me-2" aria-hidden="true">
                {checked ? '☑' : '☐'}
              </span>
              {o.label}
            </button>
          );
        })}
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
        title={selectedLabels.join(', ')}
      >
        {triggerText}
      </button>
      {open ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
