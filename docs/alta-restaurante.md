# Checklist de alta de restaurante

Responsable: `master`. Completar cada punto antes de entregar acceso al equipo.

## Identidad y alcance

- [ ] Nombre comercial confirmado.
- [ ] Slug público acordado, estable y sin datos personales.
- [ ] Restaurante creado y marcado como activo.
- [ ] Primer administrador creado con una cuenta individual.
- [ ] Restaurante asignado y configurado como activo para ese administrador.
- [ ] Acceso comprobado con la cuenta administradora, no con master.

## Configuración operativa

- [ ] Categorías, unidades y productos iniciales revisados.
- [ ] Proveedores principales creados con datos fiscales y contacto.
- [ ] Stock inicial cargado mediante un procedimiento trazable.
- [ ] Recetas prioritarias creadas con raciones e ingredientes.
- [ ] Nombres TPV y mapeos revisados.
- [ ] Carta pública revisada; solo fichas completas están publicadas.
- [ ] URL `/g/<slug>` y QR probados en móvil.

## Equipo y seguridad

- [ ] Cada persona tiene su propia cuenta y el rol mínimo necesario.
- [ ] Encargados y empleados pueden acceder solo al restaurante previsto.
- [ ] Registro libre permanece desactivado.
- [ ] Procedimiento de bloqueo y baja comunicado al administrador.
- [ ] Manual por rol entregado al equipo.

## Validación técnica

- [ ] `/api/ping` responde `200`.
- [ ] `Informes > Diagnóstico del despliegue` devuelve estado `ok`, sin `missing`.
- [ ] `multi-restaurant-validation.sql` no muestra registros cruzados o huérfanos.
- [ ] `security-validation.sql` confirma RLS, policies y permisos RPC.
- [ ] Buckets `albaranes` y `guest-menu` funcionan con el restaurante nuevo.
- [ ] Producto centinela no aparece desde otro restaurante.
- [ ] Backup y responsable de recuperación identificados.

## Prueba funcional de entrega

- [ ] Crear un producto de prueba.
- [ ] Crear un proveedor y un albarán pequeño.
- [ ] Confirmar entrada de stock e histórico de precio.
- [ ] Registrar y anular un movimiento manual de prueba.
- [ ] Cargar un CSV TPV de prueba controlado sin duplicarlo.
- [ ] Crear un cierre de inventario y revisar su CSV.
- [ ] Eliminar o archivar los datos de prueba según el procedimiento acordado.

Registrar fecha, master responsable, administrador receptor y resultado de las validaciones.
