# Guía de usuario — Asistencia Club MAEX

Manual para entrenadores, proveedores y administradores del Club Deportivo San José de Las Vegas.

## Acceso al sistema

### Entrenador

1. En la pantalla de login, pestaña **Entrenador**.
2. Pulse **Iniciar sesión con Microsoft**.
3. Use su cuenta institucional de Microsoft.
4. Tras autorizar, entrará al panel con las secciones habilitadas por el club.

### Proveedor

1. Pestaña **Proveedor**.
2. Si no tiene cuenta: **Registrarse** → complete datos → confirme el correo desde el enlace recibido.
3. Inicie sesión con correo y contraseña.
4. Opción **Recordarme** guarda la sesión en este equipo.

### Administrador

- Mismo flujo que **Entrenador** (Microsoft).
- Debe existir previamente en la base de datos con rol Administrador y cuenta confirmada.
- Verá la sección **Administrador** en el menú.

### Desarrollador (documentación API)

- Rol asignado manualmente en la base de datos (no hay autoregistro).
- Inicio de sesión: pestaña **Proveedor**, correo y contraseña.
- En el menú lateral aparece **Documentación API** (Swagger).

---

## Pantallas

### Asistencia

**Menú → Asistencia**

- Seleccione el **curso** (o “Todos los cursos” si tiene permiso global).
- Para cada participante marque: **Asistió**, **Faltó** o **Excusa**.
- En excusa puede añadir comentarios en el detalle.
- Los cambios se guardan al pulsar la acción en cada tarjeta.
- Use el buscador para filtrar por nombre, documento o ruta.
- Si no ve participantes, use el enlace de **WhatsApp de soporte** (configurado por el club).

### Historial

**Menú → Historial**

- Elija **fecha inicio** y **fecha fin** (por defecto último mes).
- Pestaña **Tabla:** listado con búsqueda y **Exportar Excel** (CSV).
- Pestaña **Gráficos:** barras de asistencia por participante.

### Información

**Menú → Información**

- Consulte datos de participantes y acudientes (teléfonos, correos).
- Filtre por curso; los administradores pueden ver todos los cursos.
- Exporte a CSV si lo necesita.

### Gestión de rúbricas

**Menú → Gestión de rúbricas**

- Cree y edite rúbricas de evaluación (nombre, tipo, niveles alto/medio/bajo).
- Filtre por curso, línea, tipo y estado.
- Active o desactive rúbricas.
- Los líderes pueden gestionar rúbricas **comunes** de su actividad.

### Reportes (evaluaciones)

**Menú → Reportes**

1. Seleccione **curso** y **participante**.
2. Revise el historial o cree/edite una evaluación.
3. Califique cada rúbrica activa (Satisfactorio Alto / Medio / Básico).
4. Opcional: suba una **foto**.
5. Guarde la evaluación.
6. **Enviar informe:** disponible solo dentro de la **ventana de fechas** definida por el club (se muestra un aviso si está cerrada).
7. Puede abrir el PDF del informe desde el detalle.

### Administrador

**Menú → Administrador** (solo rol Administrador)

- Resumen de informes enviados y pendientes.
- Filtros por período, año, categoría, línea, entrenador y estado.
- Tabla paginada, gráfico por categorías y exportación CSV.
- Abrir informes PDF en nueva pestaña.

---

## Recuperar contraseña (proveedores)

1. En login → **¿Olvidó su contraseña?**
2. Ingrese su correo.
3. Abra el enlace del correo (o use el enlace de desarrollo si se lo indicó soporte).
4. Defina una contraseña nueva de al menos 8 caracteres.

---

## Cerrar sesión

Menú lateral → **Cerrar sesión** (parte inferior).

---

## Soporte

- Asistencia sin cursos asignados: WhatsApp configurado en la pantalla de Asistencia.
- Problemas técnicos: contacte al administrador del club o al equipo de desarrollo (SitiAutomate).
