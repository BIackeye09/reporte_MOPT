// Sólo afecta al libro editable. El PDF original y la imagen conservan su
// representación; aquí se mantienen las filas, columnas y combinaciones.
export function reforzarBordesExcel(archivos,utf8) {
  const archivo=archivos.find(f=>f.nombre==='xl/styles.xml');
  let estilos=new TextDecoder().decode(archivo.bytes);
  const bordes=estilos.match(/<borders\b[^>]*>[\s\S]*?<\/borders>/);
  if(!bordes)throw new Error('Faltan los bordes de la plantilla Excel.');
  // El ajuste a carta reduce las líneas finas a una fracción de punto. Se
  // refuerzan los trazos existentes, incluidas las filas vacías, sin dibujar
  // una cuadrícula sobre las casillas combinadas ni añadir separaciones.
  estilos=estilos.replace(bordes[0],bordes[0].replace(/\bstyle="thin"/g,'style="medium"'));
  archivo.bytes=utf8(estilos);
}

function atributos(elemento,cambios,quitar=[]) {
  for(const nombre of [...Object.keys(cambios),...quitar])
    elemento=elemento.replace(new RegExp('\\s+'+nombre+'="[^"]*"','g'),'');
  return elemento.replace(/\s*\/>$/,Object.entries(cambios).map(([k,v])=>' '+k+'="'+v+'"').join('')+'/>');
}

export function corregirImpresionXml(xml,reverso=false) {
  // fitToWidth/fitToHeight sólo se aplican si fitToPage está activo.
  xml=xml.replace(/<pageSetUpPr\b[^>]*\/>/,elemento=>atributos(elemento,{fitToPage:'1'}));
  if(reverso)xml=xml.replace(/<row\b([^>]*\br="(1[3-8])"[^>]*?)>/g,(_,attrs)=>'<row'+attrs.replace(/\s+hidden="[^"]*"/g,'')+' hidden="1">');
  // Las filas 13–18 son una conversión duplicada ajena al reverso original.
  // Los tres bloques reales conservan sus nueve filas de datos cada uno.
  const configuracion=new Map();
  xml=xml.replace(/<(printOptions|pageMargins|pageSetup)\b[^>]*\/>/g,(elemento,nombre)=>{
    configuracion.set(nombre,elemento);return '';
  });
  // El margen derecho original del frente era cero. Se dejan al menos
  // 0,25 pulgadas en los cuatro lados para que el marco no quede al borde
  // físico del papel; el ajuste a una página incluye ambas tablas completas.
  const margenes=configuracion.get('pageMargins');
  if(!margenes||!configuracion.has('pageSetup'))throw new Error('Falta la configuración de impresión Excel.');
  const seguros=Object.fromEntries(['left','right','top','bottom'].map(nombre=>{
    const valor=Number(margenes.match(new RegExp('\\b'+nombre+'="([^"]+)"'))?.[1]);
    return [nombre,String(Number.isFinite(valor)?Math.max(.25,valor):.25)];
  }));
  configuracion.set('pageMargins',atributos(margenes,seguros));
  configuracion.set('pageSetup',atributos(configuracion.get('pageSetup'),{
    paperSize:'1',orientation:'portrait',fitToWidth:'1',fitToHeight:'1',
    usePrinterDefaults:'0',draft:'0',blackAndWhite:'0',horizontalDpi:'600',verticalDpi:'600'
  },['scale']));
  // Se imprimen los bordes reales, también alrededor de casillas vacías.
  // La cuadrícula de Excel introduciría líneas dentro de la plantilla.
  configuracion.set('printOptions',atributos(configuracion.get('printOptions')??'<printOptions/>',{gridLines:'0',headings:'0'}));
  // CT_Worksheet permite un solo bloque de impresión, antes del dibujo.
  const bloque=['printOptions','pageMargins','pageSetup'].map(n=>configuracion.get(n)).join('');
  const siguiente=/<(?:headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|legacyDrawingHF|drawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b|<\/worksheet>/;
  if(!siguiente.test(xml))throw new Error('No se encontró el cierre de la hoja Excel.');
  return xml.replace(siguiente,elemento=>bloque+elemento);
}
