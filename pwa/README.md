# Aplicación PWA · Versión 0.7.2

La versión **0.7.2** usa el PDF original recibido el 14/10/2026 para el reverso de la descarga PDF, conservando sus títulos, bordes y fuentes. Superpone sólo los datos de los acarreos. La vista previa y la imagen usan una representación del mismo original; desaparece el separador que cruzaba EQUIPO ALQUILADO.

Permite editar **Número de reporte** con formato **1 / 2** y agrega páginas de términos de uso y privacidad. Mantiene H.T., TRAS., los acarreos 533, el personal y sus horas, los cierres con Última línea, materiales, observaciones y las cédulas actualizadas.

Para actualizar el sitio de GitHub Pages, reemplaza **toda la carpeta pwa** del repositorio con ésta, conservando su nombre y ubicación. No subas el ZIP cerrado. Cuando se publique la actualización, abre el sitio con conexión, cierra todas sus pestañas y ventanas y vuelve a abrirlo. Confirma **Versión 0.7.2**. Conserva los datos del navegador: el dato guardado en Boleta en 0.7.0 pasa al Número de reporte y los demás campos se recuperan.

**Número de reporte** es opcional: acepta dos enteros separados por /, por ejemplo **1 / 2**. Se traslada a AD3, en la casilla Número del membrete, en Excel y en la misma ubicación en PDF e imagen. **Boleta queda vacía**. El número se digita manualmente.

Los enlaces al pie de la aplicación abren **terminos.html** y **privacidad.html**, también disponibles sin conexión. Son textos propuestos para revisión institucional. Antes de adoptarlos como definitivos deben completarse la unidad o persona responsable, su dirección y correo de contacto. Ambos documentos marcan esos datos como pendientes.

La política explica el borrador local, el catálogo de personal incluido en los archivos de la web, los datos técnicos del hospedaje y los archivos descargados. El catálogo publicado contiene nombres y cédulas y puede consultarse en un sitio o repositorio público; el documento informa de ese funcionamiento. No se añade un checkbox de consentimiento que pretenda autorizar datos de terceros.

Debajo de cada equipo aparece **Horas del equipo**. H.T. y TRAS. aceptan enteros o decimales con coma o punto, pueden quedar vacías y calculan TOTAL. En Excel se escriben en AE, AG y AH de la fila del equipo; TOTAL queda como fórmula editable. Las horas pertenecen al identificador del equipo, por lo que retirar otro no las mezcla.

Al elegir **533** se abre **Acarreo de material**, debajo de Equipo. Agrega primero las máquinas en Equipo y elige cuáles participaron en el acarreo. Para cada una, escribe capacidad decimal, longitud de acarreo entera, fuente y tipo de material, y marca una casilla por viaje. Las doce casillas corresponden a las doce columnas de la hoja original. Se cuenta cuántas están marcadas; marcar solamente la 12 cuenta como un viaje.

MOPT utiliza COD. **000**. Para municipalidades, elige provincia 1–7 y cantón 01–20; el código se concatena, por ejemplo 4 + 01 = 401. Los otros participantes admiten 800–899 o 900–999. COD. del reverso y PART (C) del mismo equipo en el frente permanecen iguales. La opción Equipo alquilado utiliza ese bloque de la plantilla. Hay nueve filas por bloque; la aplicación pide dividir el reporte si no cabe.

El subtotal es **capacidad × longitud × viajes marcados**, redondeado a dos decimales. La suma se coloca automáticamente en Producción, con unidad M³/KM. Tres equipos con 12,00, 90 y un viaje producen 1080,00 cada uno y **3240,00** en total. En Excel los viajes se marcan con **X**, con una lista desplegable; las fórmulas recalculan subtotales y producción al editar capacidad, longitud o marcas. No son controles de checkbox de Excel. El total queda vacío si se borra una capacidad o una longitud de un acarreo registrado, para evitar mostrar una producción parcial.

Con otra actividad, el panel se oculta y la producción sigue siendo manual. Los datos de acarreo se conservan en el borrador para volver a 533 y sólo se exportan con esa actividad. El reverso sigue incluido para cualquier actividad. Retirar un equipo elimina sus horas y su acarreo; retirarlo sólo del acarreo conserva la máquina y sus horas al frente.

Busca un material por código o descripción y elige una coincidencia. Se completan PART 000, CÓDIGO (H), descripción y UNID. Su cantidad empieza vacía y admite enteros o decimales con coma o punto. La tabla del documento original permite ocho materiales. Se puede retirar un material y editar sus cantidades también en el Excel descargado.

Escribe un dato en Personal o Equipo y selecciona una coincidencia. Esa selección agrega directamente los datos a su lista del reporte y a las exportaciones. Pulsa Descargar Excel para obtener el archivo completo. Si un nombre, cédula o identificador completo sólo corresponde a un registro, también se puede confirmar con Enter.

PART (C) se completa automáticamente con 000 para el personal y los materiales del MOPT; los equipos toman el participante del acarreo cuando la actividad es 533. El Excel exportado permite hacer los ajustes necesarios después de descargarlo. La carpeta ejemplos de la entrega completa incluye las distintas etapas y el caso nuevo Acarreo_533 en los tres formatos.

Desde esta carpeta ejecuta **dart herramientas/servir.dart**, o abre **iniciar.cmd** en Windows. Abre http://localhost:8080. No requiere dependencias de Flutter, SDK de Android ni Xcode.

La aplicación publicada funciona en Android, iPhone y computadora sin Flutter ni Dart. Los archivos de esta entrega sirven para actualizar el sitio existente; descargarlos no modifica automáticamente el repositorio ni la página pública.

Las observaciones son opcionales, se guardan con el borrador y se trasladan a las tres líneas de la hoja original. El formulario indica si el texto supera ese espacio antes de descargar. Excel conserva dos hojas, PDF contiene dos páginas carta y la imagen reúne ambas caras, con cualquier actividad.

Cada perfil tiene un menú de horas ordinarias, extras y su institución de pago, traslado y horas no trabajadas con su motivo. TOTAL suma las cuatro cantidades; los códigos no se suman. El total queda como fórmula en Excel y permanece vacío si no se ingresan horas.

Se reserva una fila para Última línea: caben diez trabajadores y diez equipos. Se combina y centra la fila física siguiente al último registro, independientemente para cada tabla.

## Archivos principales

| Archivo | Función |
|---|---|
| index.html, estilos.css | Formulario adaptable y accesible |
| terminos.html, privacidad.html, legal.css | Documentos de uso y privacidad y su presentación |
| app.mjs | Búsqueda, borrador local, vista previa y descargas |
| core.mjs | Reglas, fechas, cantidades, plantilla Excel y PDF |
| calendario.mjs | Fecha editable y calendario visible |
| selecciones.mjs | Búsquedas y listas independientes de trabajadores y equipos |
| materiales.mjs | Búsqueda, lista y cantidades opcionales de materiales |
| horas.mjs | Menú de horas por trabajador y cálculo del total |
| horas-equipo.mjs | H.T., TRAS. y total por equipo |
| acarreos.mjs, acarreos-reglas.mjs | Captura y cálculo de acarreos sólo para 533 |
| excel-acarreos.mjs | Celdas, fórmulas y marcas X del reverso de Excel |
| reporte.mjs | Ubicación de los datos sobre el formato original |
| sw.js | Disponibilidad sin conexión y actualización por versión |
| manifest.webmanifest, icons | Configuración de instalación |
| assets/catalogos.json | Catálogos originales preparados |
| assets/plantilla-excel.json | Componentes de la plantilla XLSX completa |
| assets/frente.png, assets/reverso.png | Formato visual del documento recibido |
| assets/reporte-normal.otf, reporte-negrita.otf | Fuentes incluidas para exportación sin Internet |
| pruebas/*.test.mjs | Pruebas de reglas, exportación y recuperación con los datos reales |
| herramientas/servir.dart | Servidor de desarrollo sin paquetes adicionales |

Al publicar una actualización cambia el nombre de caché en sw.js. La nueva versión se instala completa antes de reemplazar a la anterior; se activa al cerrar y volver a abrir las ventanas de la aplicación. El borrador se conserva independientemente de la caché.

Se comprobaron 53 pruebas de reglas, incluido el traslado del dato anterior de Boleta al Número de reporte. La impresión del Excel se ajusta a una página por cara; las filas duplicadas 13–18 del reverso convertido quedan ocultas, conservando los tres bloques reales.

## Reverso original del PDF

`assets/reverso-original.pdf` conserva los bytes del archivo recibido. `pdf.mjs` copia su página al reporte de dos caras y añade los datos mediante una capa transparente. La geometría de los acarreos se mide en esa página, incluidos los últimos viajes y las últimas filas de los tres bloques. El frente se inserta como PNG sin la compresión JPEG anterior.

`vendor/pdf-lib.min.mjs` incluye pdf-lib 1.17.1 y su licencia está en `vendor/LICENCIA-PDF-LIB.md`. La biblioteca y la plantilla se conservan en la caché local: la exportación funciona sin conexión y no envía los datos a servicios externos.

La plantilla editable de Excel se conserva. El borrador mantiene su versión 9 y sus datos.
