# Capas CSS (z-index) — panel asistencia

Valores alineados con la [escala de Bootstrap 5.3](https://getbootstrap.com/docs/5.3/layout/z-index/) donde aplica (sticky 1020, offcanvas 1040/1045, modal backdrop 1050, modal 1055, toast 1090). Las superposiciones custom del panel usan rangos **por encima del drawer de reportes móvil** para que los modales y toasts no queden tapados.

| Orden (bajo → alto) | Selector | z-index | Notas |
|---------------------|----------|---------|--------|
| Toolbar sticky | `.att-toolbar--sticky` | 1015 | Debajo del header sticky |
| Header sticky | `.att-header` | 1020 | Igual que sticky Bootstrap |
| Dropdown curso (contexto local) | `.att-course-dropdown` | 30 | Relativo a `.att-course-picker` |
| Sidebar — overlay | `.att-sidebar-overlay` | 1040 | Como offcanvas backdrop |
| Sidebar — panel | `.att-sidebar` | 1045 | Como offcanvas |
| Reportes móvil — scrim | `.att-reportes-mobile-scrim` | 1050 | Debajo del panel lateral |
| Reportes móvil — panel | `.att-reportes-right` (fixed) | 1060 | Sobre scrim, bajo modales |
| Modal — backdrop | `.att-modal-backdrop` | 1070 | Sobre capas de reportes |
| Modal — caja | `.att-modal` | 1 | Relativo; orden dentro del backdrop flex |
| Toast | `.att-toast` | 1090 | Como toast Bootstrap |

## Breakpoints unificados (referencia)

- `576px` (`sm`): rejilla 2 columnas en tarjetas, anchos de búsqueda.
- `768px` (`md`): controles del header, layout reportes.
- `992px` (`lg`): rejilla 3 columnas en tarjetas (antes 1100px).
- `575.98px`: layout compacto de toolbar / tablas (antes 640px).
- `399.98px`: toolbar a una columna (antes 420px).

## Riesgos conocidos

- **Altura fija**: `.att-reportes-page` usa `calc(100dvh - 84px)` asumiendo altura del chrome del header; revisar en iOS si hay saltos con barra de direcciones.
- **Toolbar sticky**: `top: 3.6rem` depende de la altura visual del header; si cambia el padding del header, revisar este valor.
