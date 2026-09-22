import { IconSearch } from './GestionIcons.jsx';

/**
 * Input de búsqueda con ícono de lupa.
 * Acepta las mismas props que un <input> (value, onChange, placeholder, className…).
 */
export function GestionSearchInput({
  className = '',
  inputClassName = 'form-control form-control-sm',
  style,
  ...props
}) {
  return (
    <div className={`att-gestion-search ${className}`.trim()} style={style}>
      <span className="att-gestion-search__icon" aria-hidden="true">
        <IconSearch size={15} />
      </span>
      <input type="search" className={`att-gestion-search__input ${inputClassName}`.trim()} {...props} />
    </div>
  );
}
