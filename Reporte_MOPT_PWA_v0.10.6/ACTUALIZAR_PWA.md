# Actualizar Reporte MOPT versión 0.10.6

La versión **0.10.6** permite registrar el traslado en horas decimales, tanto para personal como para equipo: **0,25 h = 15 minutos**, **0,5 h = 30 minutos** y **0,75 h = 45 minutos**. Acepta coma o punto, conserva los enteros y permite vacío o 0 cuando no hay traslado. La cantidad se suma al total y se exporta como número en Excel, PDF e imagen.

La versión **0.10.5** alinea el nombre del inspector a la izquierda en Excel, PDF, imagen y vista previa, dentro de su casilla original. Conserva el tamaño, la fuente y los datos del borrador.

La versión **0.10.4** agrega **Sin justificar** a NO TRAB. JUST. Se pueden registrar horas no trabajadas sin un motivo. Esa opción guarda una cadena vacía: la casilla JUST. queda vacía en Excel, PDF e imagen. La cantidad de horas no trabajadas sigue siendo opcional; si se escribe, se suma al total. Los motivos 1 a 7 se mantienen disponibles. Los borradores anteriores se conservan.

El parche **0.10.3** del 20 de octubre de 2026 permite TRAS. desde una hora, deja las señas vacías cuando no hay estacionamientos, incorpora el nombre editable del inspector con la opción Grechen Calderón y agrega a Manuel Cascante al catálogo de personal (código 09, cédula 1-1325-0454). El inspector se guarda y comparte con las continuaciones y aparece en su casilla original de Excel, PDF e imagen.

## Cambios del parche

- **TRAS. del personal:** acepta 1 h como mínimo positivo y decimales desde 1 h. Vacío y 0 siguen admitidos cuando no hay traslado. El total suma esas horas. La validación de horas de equipo conserva sus cantidades decimales y también admite 1 h.
- **Estacionamientos vacíos:** si ambos están vacíos, SEÑAS DE INICIO no imprime texto ni guiones y el avance queda vacío. Si se completa sólo uno, se pide completar el otro; 0 se considera una estación real. Se mantienen las exclusiones de 533 y 534.
- **Inspector:** campo opcional de texto, con Grechen Calderón como sugerencia. Se pueden escribir otros nombres. Se guarda con el borrador, se comparte en las continuaciones y se exporta sobre la línea del inspector de la plantilla original (U45:AG45 en Excel), conservando su rótulo y los demás espacios de firma.
- **Personal:** Manuel Cascante, código 09, cédula 1-1325-0454, PART 000, regional V Heredia. Puede buscarse por nombre, cédula o código. Se conserva el catálogo anterior completo.
- Los borradores de la versión anterior se recuperan con Inspector vacío. Se conservan personal, horas, materiales, equipos y reportes. No borres los datos del navegador para actualizar.
- Los textos fijos de la plantilla oficial se conservan; la nueva directriz de traslado se aplica en el formulario y su validación.

Esta revisión incorpora la retroalimentación de personal, equipo y continuaciones.

## Actualización

1. Descomprime **Reporte_MOPT_PWA_v0.10.6.zip** en una carpeta nueva.
2. Reemplaza **toda la carpeta pwa** del repositorio, conservando su nombre y ubicación. No subas el ZIP cerrado.
3. Guarda el commit, haz push y espera a que GitHub Pages publique.
4. Abre con conexión, cierra todas las pestañas y ventanas de la aplicación y vuelve a abrirla. Confirma **Versión 0.10.6**.
5. Conserva los datos del navegador para recuperar el conjunto guardado. Los archivos descargados antes deben generarse de nuevo.

## Estacionamientos compartidos

Se eligió compartir los estacionamientos entre todos los reportes del conjunto. Cambiar inicio o final desde cualquier hoja actualiza las demás y su longitud de avance calculada. Por ejemplo, 4,5 a 9,87 se imprime como **Estacionamiento 4 + 500 al 9 + 870**, con **5,37 km** en cada frente.

Con las actividades 533 y 534 siguen ocultos y no se exportan señas ni avance. Los demás datos operativos siguen siendo propios de cada hoja: personal, equipo, materiales, horas, producción, problema, observaciones y acarreo.

Al recuperar un conjunto de versiones anteriores se toman las estaciones del reporte 1 como comunes. Si otra hoja tenía estaciones diferentes y no vacías, se conservan como referencia visible debajo de los estacionamientos, sin sustituir silenciosamente ese dato histórico. La referencia permanece en el borrador; las exportaciones usan las estaciones compartidas actuales.

## Continuaciones sin redirección

El conjunto empieza en **1 / 1**. Al agregar al trabajador 12 se crea **2 / 2**, el primero pasa a **1 / 2** y **sigues en la pantalla del primer reporte**. Un aviso con **Entendido** indica dónde se agregó el trabajador. Usa el selector superior o Siguiente cuando quieras ir a esa hoja.

Si continúas agregando desde una hoja llena, los trabajadores se incorporan a la siguiente continuación con espacio. Al superar 22 se crea una tercera hoja y se actualiza toda la numeración. Tampoco se redirige. No se modifica ni se amplía la plantilla original.

El ingreso por catálogo y el manual funcionan igual. Un intento duplicado no crea una hoja. Retirar personal no redistribuye los datos. Una continuación sin datos propios puede quitarse aunque contenga los estacionamientos compartidos. Guardar conserva todo el conjunto y la hoja seleccionada; Nuevo conjunto reemplaza todo el borrador, previa confirmación.

## Duplicados

- **Personal:** nombre y cédula son únicos por separado en todo el conjunto. Se ignoran mayúsculas, tildes y espacios repetidos al comparar nombres. El código del trabajador sí puede repetirse.
- **Equipo:** el N.º de equipo es único en todo el conjunto, incluso con COD. (F) diferente. Los ceros iniciales no permiten eludir el control: 073 y 73 se consideran el mismo número. COD. (F) y descripción sí pueden repetirse.
- Se revisan altas por catálogo, datos manuales, correcciones de manuales y borradores anteriores antes de exportar. Editar un registro sin cambiar sus datos no lo confunde con un duplicado de sí mismo.
- No se borra un duplicado de un borrador anterior: se pide corregirlo o retirarlo antes de descargar.

## Exportaciones

Excel reúne un par de hojas FrenteRDA / AtrásRDA por reporte; PDF incluye dos páginas carta por reporte. Las imágenes se entregan como un PNG con ambas caras o, con continuaciones, un ZIP con un PNG por reporte. Para imprimir el Excel, selecciona **Imprimir todo el libro**, tamaño Carta. Las fórmulas de acarreo siguen apuntando a su propio reverso. PAG. mantiene **Si** y **No**.

## Acarreo contratado 534

Selecciona 534 y agrega los equipos al panel de acarreo. Cada equipo nuevo se propone en Equipo alquilado. Si corresponde a otro participante, selecciona su tipo y código real y desmarca Equipo alquilado. La aplicación no inventa un código de contratista. Capacidad × longitud × viajes se suma en Producción, igual que en 533. Los registros ya capturados conservan su clasificación al cambiar de actividad; un 534 MOPT sin alquiler requiere corrección antes de descargar.

## Horas extra

PAG. ahora se selecciona como SI o NO y no es un código de institución. Con horas extra mayores que cero se exige respuesta. Un código antiguo se muestra como referencia para que el usuario tome la decisión; no se convierte automáticamente en SI.

## Estacionamientos y avance

Escribe 4,5 al inicio y 9,87 al final. El reporte muestra **Estacionamiento 4 + 500 al 9 + 870** y calcula **5,37 km** de avance. Se aceptan coma o punto y hasta tres decimales. Ambos campos pueden estar vacíos, pero si se completa uno se necesita el otro. No se admite un final menor que el inicio.

Con 533 o 534 no aparece el panel y señas y avance quedan vacíos en Excel, PDF e imagen. La longitud de acarreo se completa por separado en el reverso. Al regresar a otra actividad vuelven los estacionamientos guardados.

El Excel permite corregir D14 conservando el formato de estaciones; AA16 recalcula la diferencia. PAG. ofrece una lista SI/NO. Continúan los bordes reforzados y la impresión en tamaño carta, una página por cara. Selecciona Carta también en la impresora e Imprimir todo el libro para ambas caras.

La aplicación sigue funcionando en el dispositivo y sin conexión después de la carga completa. La plantilla original del PDF, los catálogos y las once filas de datos se conservan.
