# Accesibilidad y QA visual

Ejecutar esta revisión antes de una versión importante y después de modificar navegación, modales o
formularios.

## Teclado y foco

1. Pulsar `Tab` al abrir la app: debe aparecer `Saltar al contenido`.
2. Pulsar `Enter`: el foco debe pasar al contenido principal.
3. Abrir cada modal operativo: el foco entra en el diálogo y no sale al fondo con `Tab`.
4. Pulsar `Escape`: el diálogo se cierra y el foco vuelve al control que lo abrió.
5. Abrir selectores, menús y notificaciones con teclado; `Escape` debe cerrarlos y devolver el foco.
6. Confirmar que todo elemento interactivo muestra un contorno de foco claramente visible.

## Lectores de pantalla

- Los diálogos deben anunciar título y descripción, además de su condición modal.
- Los botones que solo muestran iconos deben tener un nombre accesible.
- Los errores y estados transitorios importantes deben usar regiones `status` o `alert` cuando
  proceda.
- El orden de encabezados debe describir la estructura de la pantalla sin depender de su tamaño.

## Movimiento y contraste

- Con `Reducir movimiento` activado en el sistema, las animaciones y transiciones deben quedar
  prácticamente deshabilitadas.
- Texto, controles, foco, errores y estados deshabilitados deben conservar contraste legible.
- El color nunca debe ser la única forma de comunicar un estado.

## Matriz visual mínima

| Vista | Tamaño de referencia | Validar |
| --- | --- | --- |
| Móvil | 390 x 844 | Sin recorte horizontal, acciones alcanzables y modales desplazables |
| Tablet | 768 x 1024 | Rejillas estables y navegación sin solapes |
| Escritorio | 1440 x 1000 | Jerarquía, densidad, foco y ancho de lectura |

Guardar capturas solo cuando sean necesarias para una incidencia o una revisión de versión; no deben
contener datos personales ni información real del restaurante.
