# Aplicación PWA · Versión 0.10.5

La versión **0.10.5** alinea el nombre del inspector a la izquierda en Excel, PDF, imagen y vista previa, dentro de su casilla original. Conserva el tamaño, la fuente y los datos del borrador.

La versión **0.10.4** agrega **Sin justificar** a NO TRAB. JUST. Se pueden registrar horas no trabajadas sin un motivo. Esa opción guarda una cadena vacía: la casilla JUST. queda vacía en Excel, PDF e imagen. La cantidad de horas no trabajadas sigue siendo opcional; si se escribe, se suma al total. Los motivos 1 a 7 se mantienen disponibles. Los borradores anteriores se conservan.


El parche **0.10.3** del 20 de octubre de 2026 permite TRAS. desde una hora, deja las señas vacías cuando no hay estacionamientos, incorpora el nombre editable del inspector con la opción Grechen Calderón y agrega a Manuel Cascante al catálogo de personal (código 09, cédula 1-1325-0454). El inspector se guarda y comparte con las continuaciones y aparece en su casilla original de Excel, PDF e imagen.


La revisión 0.10.2 comparte estacionamientos y avance entre las hojas, crea continuaciones sin redirigir y controla nombres, cédulas y números de equipo únicos en todo el conjunto. Código de trabajador, COD. (F) y descripción de equipo pueden repetirse. Consulta **ACTUALIZAR_PWA.md** para la actualización y recuperación de borradores.


Esta revisión muestra un aviso **Nuevo reporte creado** cuando se añade una continuación por completar los once espacios de personal. Pulsa **Entendido** para seguir. PAG. presenta **Si** y **No** en el formulario, Excel, PDF e imagen; conserva las respuestas de los borradores anteriores.


La versión **0.10.2** agrega reportes continuados automáticamente a partir del trabajador 12. El selector superior permite volver a cada hoja; todas comparten camino, actividad y fecha y conservan sus propios datos operativos. La numeración inicia en 1/1 y se actualiza para todo el conjunto. Consulta ACTUALIZAR_PWA.md en la entrega para el funcionamiento y los pasos de actualización.


La versión **0.9.0** habilita el acarreo contratado 534, cambia PAG. de horas extra a SI o NO y calcula las señas y el avance desde dos estacionamientos. Las actividades 533 y 534 no muestran ni exportan estacionamientos, señas ni avance. Se conservan los once espacios de personal y equipo, la plantilla original del PDF y las mejoras de impresión del Excel.

La versión **0.8.2** corrige la preparación del Excel para imprimir: refuerza los bordes existentes, conserva las filas vacías, deja márgenes de al menos 0,25 pulgadas y configura tamaño carta, orientación vertical, calidad normal de 600 ppp y una página por cara. No se activa la cuadrícula de Excel ni se añaden divisiones a las casillas combinadas. Los reportes ya descargados deben generarse otra vez. El PDF y la imagen conservan su representación.

La versión **0.8.1** hace obligatorio el Número de reporte, impide que haya más equipos que personal y permite agregar y corregir trabajadores y equipos manualmente. Los registros manuales se guardan con el reporte y conservan sus horas al editarse. Fuente de materiales y Tipo de material se exportan en tamaño 14 sin negrita. Se mantienen los once espacios de cada tabla y su cierre Última línea.

La versión **0.7.2** usa el PDF original recibido el 14/10/2026 para el reverso de la descarga PDF, conservando sus títulos, bordes y fuentes. Superpone sólo los datos de los acarreos. La vista previa y la imagen usan una representación del mismo original; desaparece el separador que cruzaba EQUIPO ALQUILADO.

El Número de reporte se calcula automáticamente para las continuaciones. Incluye páginas de términos de uso y privacidad. Mantiene H.T., TRAS., los acarreos 533, el personal y sus horas, los cierres con Última línea, materiales, observaciones y las cédulas actualizadas.

Para actualizar el sitio de GitHub Pages, reemplaza **toda la carpeta pwa** del repositorio con ésta, conservando su nombre y ubicación. No subas el ZIP cerrado. Cuando se publique la actualización, abre el sitio con conexión, cierra todas sus pestañas y ventanas y vuelve a abrirlo. Confirma **Versión 0.10.5**. Conserva los datos del navegador: el dato guardado en Boleta en 0.7.0 pasa al Número de reporte y los demás campos se recuperan.

**Número de reporte** se completa automáticamente, por ejemplo **1 / 2**. Se traslada a AD3, en la casilla Número del membrete, en Excel y en la misma ubicación en PDF e imagen. **Boleta queda vacía**. La numeración no se modifica manualmente.

Los enlaces al pie de la aplicación abren **terminos.html** y **privacidad.html**, también disponibles sin conexión. La versión 1.1 identifica al MOPT como unidad responsable, con dirección contigua al cementerio de Santo Domingo, correo santiagogranadosvalerio@gmail.com y teléfono 2244-1100. Correo y teléfono tienen enlaces de contacto.

La política explica el borrador local, el catálogo de personal incluido en los archivos de la web, los datos técnicos del hospedaje y los archivos descargados. El catálogo publicado contiene nombres y cédulas y puede consultarse en un sitio o repositorio público; el documento informa de ese funcionamiento. No se añade un checkbox de consentimiento que pretenda autorizar datos de terceros.

Debajo de cada equipo aparece **Horas del equipo**. H.T. y TRAS. aceptan enteros o decimales con coma o punto, pueden quedar vacías y calculan TOTAL. En Excel se escriben en AE, AG y AH de la fila del equipo; TOTAL queda como fórmula editable. Las horas pertenecen al identificador del equipo, por lo que retirar otro no las mezcla.

Al elegir **533 o 534** se abre **Acarreo de material**, debajo de Equipo. Agrega primero las máquinas en Equipo y elige cuáles participaron en el acarreo. Para cada una, escribe capacidad decimal, longitud de acarreo entera, fuente y tipo de material, y marca una casilla por viaje. Las doce casillas corresponden a las doce columnas de la hoja original. Se cuenta cuántas están marcadas; marcar solamente la 12 cuenta como un viaje.

MOPT utiliza COD. **000**. Para municipalidades, elige provincia 1–7 y cantón 01–20; el código se concatena, por ejemplo 4 + 01 = 401. Los otros participantes admiten 800–899 o 900–999. COD. del reverso y PART (C) del mismo equipo en el frente permanecen iguales. La opción Equipo alquilado utiliza ese bloque de la plantilla. Hay nueve filas por bloque; la aplicación pide dividir el reporte si no cabe.

El subtotal es **capacidad × longitud × viajes marcados**, redondeado a dos decimales. La suma se coloca automáticamente en Producción, con unidad M³/KM. Tres equipos con 12,00, 90 y un viaje producen 1080,00 cada uno y **3240,00** en total. En Excel los viajes se marcan con **X**, con una lista desplegable; las fórmulas recalculan subtotales y producción al editar capacidad, longitud o marcas. No son controles de checkbox de Excel. El total queda vacío si se borra una capacidad o una longitud de un acarreo registrado, para evitar mostrar una producción parcial.

Con otra actividad, el panel se oculta y la producción sigue siendo manual. Los datos de acarreo se conservan en el borrador para volver a 533 o 534 y sólo se exportan con esas actividades. El reverso sigue incluido para cualquier actividad. Retirar un equipo elimina sus horas y su acarreo; retirarlo sólo del acarreo conserva la máquina y sus horas al frente.

Busca un material por código o descripción y elige una coincidencia. Se completan PART 000, CÓDIGO (H), descripción y UNID. Su cantidad empieza vacía y admite enteros o decimales con coma o punto. La tabla del documento original permite ocho materiales. Se puede retirar un material y editar sus cantidades también en el Excel descargado.

Escribe un dato en Personal o Equipo y selecciona una coincidencia. Esa selección agrega directamente los datos a su lista del reporte y a las exportaciones. Pulsa Descargar Excel para obtener el archivo completo. Si un nombre, cédula o identificador completo sólo corresponde a un registro, también se puede confirmar con Enter.

PART (C) se completa automáticamente con 000 para el personal y los materiales del MOPT; los equipos toman el participante del acarreo cuando la actividad es 533 o 534. El Excel exportado permite hacer los ajustes necesarios después de descargarlo. La carpeta ejemplos de la entrega completa incluye las distintas etapas y el caso nuevo Acarreo_533 en los tres formatos.

Desde esta carpeta ejecuta **dart herramientas/servir.dart**, o abre **iniciar.cmd** en Windows. Abre http://localhost:8080. No requiere dependencias de Flutter, SDK de Android ni Xcode.

La aplicación publicada funciona en Android, iPhone y computadora sin Flutter ni Dart. Los archivos de esta entrega sirven para actualizar el sitio existente; descargarlos no modifica automáticamente el repositorio ni la página pública.

Las observaciones son opcionales, se guardan con el borrador y se trasladan a las tres líneas de la hoja original. El formulario indica si el texto supera ese espacio antes de descargar. Excel y PDF reúnen un frente y un reverso por reporte. Con continuaciones, las imágenes se entregan en un ZIP con un PNG por reporte, con cualquier actividad.

Cada perfil tiene un menú de horas ordinarias, extras y la respuesta SI/NO sobre su pago, traslado y horas no trabajadas con su motivo. TOTAL suma las cuatro cantidades; los códigos no se suman. El total queda como fórmula en Excel y permanece vacío si no se ingresan horas.

Se reserva una fila para Última línea: caben once trabajadores y once equipos. Se combina y centra la fila física siguiente al último registro, independientemente para cada tabla.

## Ingreso manual de Personal y Equipo

Debajo de cada buscador abre **Agregar trabajador manualmente** o **Agregar equipo manualmente**. El trabajador requiere nombre y apellidos, cédula y código (D). La cédula acepta nueve dígitos o X-XXXX-XXXX y se exporta con guiones; un código de un dígito se completa con cero inicial. Puede utilizarse - si el código del trabajador no está disponible. Para un equipo se requieren COD. (F) y N.º de equipo; la descripción es opcional. Se conservan los ceros del número de equipo. PART (C) del MOPT es 000.

Pulsa **Agregar trabajador** o **Agregar equipo** para incorporarlo a la lista y completar sus horas. **Editar datos** corrige un registro manual manteniendo su ID, horas y acarreo. **Cancelar** descarta únicamente la edición sin confirmar. Antes de descargar se pide confirmar o cancelar cualquier formulario manual pendiente. Los registros manuales se guardan en el borrador actual, se recuperan al volver a abrir la aplicación y se exportan a Excel, PDF e imagen. Crear un reporte nuevo comienza sin esos registros. Los catálogos originales se conservan y no se publican nuevos datos por ingresar un registro manual.

La cantidad de equipos debe ser menor o igual a la del personal. Para retirar un trabajador cuando ambas cantidades son iguales, retira primero un equipo. La aplicación no elimina máquinas ni horas por su cuenta. Un borrador anterior que incumpla la relación se recupera completo, pero requiere corregirla antes de exportar.

## Archivos principales

| Archivo | Función |
|---|---|
| index.html, estilos.css | Formulario adaptable y accesible |
| terminos.html, privacidad.html, legal.css | Documentos de uso y privacidad y su presentación |
| app.mjs | Búsqueda, borrador local, vista previa y descargas |
| core.mjs | Reglas, fechas, cantidades, plantilla Excel y PDF |
| calendario.mjs | Fecha editable y calendario visible |
| entrada-manual.mjs, registros.mjs | Formularios manuales, identidad estable y datos propios del reporte |
| texto-acarreo.mjs | Ajuste de los textos del reverso a 14 puntos sin negrita |
| selecciones.mjs | Búsquedas y listas independientes de trabajadores y equipos |
| materiales.mjs | Búsqueda, lista y cantidades opcionales de materiales |
| horas.mjs | Menú de horas por trabajador y cálculo del total |
| horas-equipo.mjs | H.T., TRAS. y total por equipo |
| acarreos.mjs, acarreos-reglas.mjs | Captura y cálculo de acarreos para 533 y 534 |
| excel-acarreos.mjs | Celdas, fórmulas y marcas X del reverso de Excel |
| estacionamientos.mjs | Conversión a metros, señas, avance y fórmula de Excel |
| impresion-excel.mjs | Bordes reforzados, márgenes y configuración de impresión del Excel |
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

Se comprobaron 80 pruebas de reglas, incluido el traslado del dato anterior de Boleta al Número de reporte, los bordes de las filas vacías y los márgenes de impresión. La impresión del Excel se ajusta a una página por cara; las filas duplicadas 13–18 del reverso convertido quedan ocultas, conservando los tres bloques reales.

## Reverso original del PDF

`assets/reverso-original.pdf` conserva los bytes del archivo recibido. `pdf.mjs` copia su página al reporte de dos caras y añade los datos mediante una capa transparente. La geometría de los acarreos se mide en esa página, incluidos los últimos viajes y las últimas filas de los tres bloques. El frente se inserta como PNG sin la compresión JPEG anterior.

`vendor/pdf-lib.min.mjs` incluye pdf-lib 1.17.1 y su licencia está en `vendor/LICENCIA-PDF-LIB.md`. La biblioteca y la plantilla se conservan en la caché local: la exportación funciona sin conexión y no envía los datos a servicios externos.

La plantilla editable de Excel conserva sus filas, columnas y combinaciones. El borrador usa la versión 11 y recupera los datos anteriores.

## Cambios de la versión 0.9.0

**Acarreo 534.** El código ya existía en el catálogo original. Ahora abre el mismo panel de capacidades, distancias y viajes que 533 y calcula la producción en M³/KM. Un equipo agregado al acarreo 534 comienza marcado como Equipo alquilado y se exporta en ese bloque. Para usar Equipo de otros participantes, se identifica al participante real y se desmarca Equipo alquilado. No se deduce un código institucional a partir de la actividad. Un registro MOPT sin marcar alquiler en 534 requiere clasificación antes de exportar. Cambiar de actividad conserva los acarreos del borrador; no reclasifica registros ya capturados por su cuenta.

**PAG.** Debajo de cada trabajador se elige Sin completar, SI o NO. Con extras mayores que cero debe responderse SI o NO. La respuesta es texto y no interviene en TOTAL. El Excel incluye una lista SI/NO en las once filas de PAG.

**Estacionamientos.** En otras actividades se escriben inicio y final en kilómetros con coma o punto y hasta tres decimales. Por ejemplo, 4,5 y 9,87 se imprimen como Estacionamiento 4 + 500 al 9 + 870. Los metros se muestran con tres dígitos: 1,001 es 1 + 001. El avance del ejemplo es 5,37 km; se calcula con metros enteros para evitar errores de resta decimal. El final no puede ser menor que el inicio; dos valores iguales producen cero. Ambos pueden dejarse vacíos; completar sólo uno impide exportar.

En 533 y 534 se oculta y deshabilita todo el panel de estacionamientos, y las señas y el avance se exportan vacíos en los tres formatos. Al volver a otra actividad se recuperan los números escritos. La LONG. ACARREO del reverso es un dato independiente. En Excel, AA16 calcula el avance leyendo las estaciones del texto visible D14; si se corrige ese texto debe conservarse el formato Estacionamiento km + mmm al km + mmm.

**Borradores anteriores.** Los códigos antiguos de PAG. se conservan como referencia, pero se solicita SI/NO porque conocer la institución no permite inferir la respuesta. Las señas y el avance manuales anteriores se conservan como referencia visible y no sustituyen las estaciones nuevas. Si las señas ya tenían el formato completo de estacionamientos, se recuperan sus dos valores. Los textos incompletos se guardan para corregirlos al volver a abrir. La descarga de un archivo nuevo no modifica los reportes exportados antes.
