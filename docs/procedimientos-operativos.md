# Procedimientos operativos

## Cierre de inventario

Responsable: `administrador` o `master`.

1. Confirmar que todas las compras y ventas TPV del periodo están registradas.
2. Revisar en `Stock` productos negativos, sin unidad, sin coste o por debajo del mínimo.
3. Corregir únicamente diferencias justificadas y dejar un motivo trazable.
4. Ir a `Informes > Valor financiero del inventario`.
5. Revisar el estado de preparación del cierre.
6. Si hay avisos, resolverlos o documentar por qué se acepta el cierre con incidencias.
7. Pulsar `Crear cierre de hoy` y confirmar.
8. Comprobar que aparece en el histórico y exportar el CSV si forma parte del cierre periódico.

Un segundo cierre del mismo día crea otra fotografía; no sustituye la anterior. No usar un cierre con
stock negativo o costes ausentes como referencia contable sin dejar constancia de la excepción.

## Anular un movimiento manual

Responsable: `encargado`, `administrador` o `master`.

1. Abrir `Historial` y localizar el movimiento exacto.
2. Confirmar producto, hora, motivo, cantidad y stock anterior/posterior.
3. Pulsar `Anular`.
4. Verificar que no existen movimientos posteriores incompatibles.
5. Confirmar la anulación y comprobar el stock restaurado.

Solo se pueden anular movimientos manuales y la operación puede rechazarse si ya existen movimientos
posteriores. Un movimiento procedente de albarán o TPV debe corregirse desde su documento de origen.

## Anular un albarán

Responsable: `encargado`, `administrador` o `master`.

1. Abrir `Albaranes` y entrar en el documento.
2. Confirmar número, proveedor, fecha, total y líneas afectadas.
3. Elegir `Anular` e indicar un motivo específico.
4. Confirmar que el albarán queda marcado como anulado.
5. Revisar `Stock` e `Historial`: la operación atómica debe revertir sus movimientos.
6. Revisar la entrada correspondiente en `Auditoría` si el resultado no es el esperado.

No crear un albarán inverso para ocultar un error. Si la respuesta se pierde por red, comprobar primero
el estado del documento antes de repetir la anulación.

## Importar ventas TPV

Responsable: `administrador` o `master`.

1. Exportar el CSV del TPV para el restaurante y fecha correctos.
2. Abrir `TPV`, seleccionar fecha y cargar el archivo.
3. Revisar número de líneas, cantidades, importes y artículos ignorados.
4. Resolver todos los mapeos pendientes hacia recetas.
5. Confirmar que cada receta aplicable tiene ingredientes y cantidades coherentes.
6. Aplicar la importación una sola vez.
7. Comprobar el resumen de ventas, productos afectados y consumos generados.
8. Revisar una muestra en `Historial` y las alertas de `Informes`.

Nexo identifica archivos duplicados y un borrador aplicado no puede aplicarse de nuevo. No existe una
anulación TPV general desde la interfaz: ante un error, detener nuevas importaciones y seguir el
procedimiento de descuadre antes de realizar ajustes manuales aprobados.

## Resolver un descuadre de stock

Responsable: `encargado` para revisión y ajustes justificados; `administrador` para TPV, recetas e
investigación completa.

1. No ajustar todavía. Anotar producto, stock esperado, stock mostrado, hora y restaurante.
2. Revisar `Historial` desde el último recuento correcto.
3. Identificar el origen: manual, albarán, TPV, merma o rotura.
4. Comprobar albaranes anulados, CSV duplicados, artículos TPV ignorados y receta/ingredientes.
5. Si el origen es un movimiento manual reciente, intentar su anulación.
6. Si es un albarán incorrecto, anular el documento completo y registrarlo de nuevo correctamente.
7. Si el origen no puede revertirse, realizar un ajuste de inventario con motivo detallado.
8. Confirmar el nuevo stock, revisar auditoría y documentar la causa raíz.

Escalar cuando afecte a varios productos, se repita, implique otro restaurante o no exista un origen
trazable. No corregir varias diferencias con un único ajuste genérico.
