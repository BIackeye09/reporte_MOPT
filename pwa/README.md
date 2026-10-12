# Aplicación PWA · Versión 0.6.0

La versión **0.6.0** incorpora horas por trabajador y los cierres con Última línea. Mantiene las observaciones opcionales, el reverso obligatorio, los materiales, las cédulas actualizadas y la corrección del XML del Excel.

Para aplicar la actualización, utiliza los archivos nuevos y cierra todas las pestañas y ventanas de la aplicación. Vuelve a abrirla y confirma **Versión 0.6.0**. No borres los datos del navegador: los borradores anteriores se recuperan con sus datos y materiales, y con las observaciones existentes y las horas inicialmente vacías.

Esta es la aplicación para llenar el encabezado, personal, equipos, materiales y observaciones. Las horas de equipo y los acarreos corresponden a las siguientes etapas.

Busca un material por código o descripción y elige una coincidencia. Se completan PART 000, CÓDIGO (H), descripción y UNID. Su cantidad empieza vacía y admite enteros o decimales con coma o punto. La tabla del documento original permite ocho materiales. Se puede retirar un material y editar sus cantidades también en el Excel descargado.

Escribe un dato en Personal o Equipo y selecciona una coincidencia. Esa selección agrega directamente los datos a su lista del reporte y a las exportaciones. Pulsa Descargar Excel para obtener el archivo completo. Si un nombre, cédula o identificador completo sólo corresponde a un registro, también se puede confirmar con Enter.

PART (C) se completa automáticamente con 000 para el personal, los equipos y los materiales del MOPT. El Excel exportado permite hacer los ajustes necesarios después de descargarlo. La carpeta ejemplos contiene Ejemplo_Materiales_MOPT en los tres formatos.

Desde esta carpeta ejecuta **dart herramientas/servir.dart**, o abre **iniciar.cmd** en Windows. Abre http://localhost:8080. No requiere dependencias de Flutter, SDK de Android ni Xcode.

El archivo README.md de la carpeta superior explica los campos, las exportaciones y la instalación por HTTPS. El servidor local es una vista de desarrollo; esta entrega todavía no contiene un sitio publicado.

Las observaciones son opcionales, se guardan con el borrador y se trasladan a las tres líneas de la hoja original. El formulario indica si el texto supera ese espacio antes de descargar. Excel conserva dos hojas, PDF contiene dos páginas carta y la imagen reúne ambas caras, con cualquier actividad.

Cada perfil tiene un menú de horas ordinarias, extras y su institución de pago, traslado y horas no trabajadas con su motivo. TOTAL suma las cuatro cantidades; los códigos no se suman. El total queda como fórmula en Excel y permanece vacío si no se ingresan horas.

Se reserva una fila para Última línea: caben diez trabajadores y diez equipos. Se combina y centra la fila física siguiente al último registro, independientemente para cada tabla.

## Archivos principales

| Archivo | Función |
|---|---|
| index.html, estilos.css | Formulario adaptable y accesible |
| app.mjs | Búsqueda, borrador local, vista previa y descargas |
| core.mjs | Reglas, fechas, cantidades, plantilla Excel y PDF |
| calendario.mjs | Fecha editable y calendario visible |
| selecciones.mjs | Búsquedas y listas independientes de trabajadores y equipos |
| materiales.mjs | Búsqueda, lista y cantidades opcionales de materiales |
| horas.mjs | Menú de horas por trabajador y cálculo del total |
| reporte.mjs | Ubicación de los datos sobre el formato original |
| sw.js | Disponibilidad sin conexión y actualización por versión |
| manifest.webmanifest, icons | Configuración de instalación |
| assets/catalogos.json | Catálogos originales preparados |
| assets/plantilla-excel.json | Componentes de la plantilla XLSX completa |
| assets/frente.png, assets/reverso.png | Formato visual del documento recibido |
| assets/reporte-normal.otf, reporte-negrita.otf | Fuentes incluidas para exportación sin Internet |
| pruebas/reglas.test.mjs | Pruebas con los datos reales |
| herramientas/servir.dart | Servidor de desarrollo sin paquetes adicionales |

Al publicar una actualización cambia el nombre de caché en sw.js. La nueva versión se instala completa antes de reemplazar a la anterior; se activa al cerrar y volver a abrir las ventanas de la aplicación. El borrador se conserva independientemente de la caché.
