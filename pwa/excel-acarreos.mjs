import {lineasTextoAcarreo} from './texto-acarreo.mjs';
import {equipoDelReporte} from './registros.mjs';
import {FILAS_ACARREOS,filasAcarreos,codigoParticipante,enteroAcarreo,subtotalAcarreo} from './acarreos-reglas.mjs';
// Se escribe sobre las celdas del documento original; no se reconstruye la hoja.
const columnas=Array.from({length:19},(_,i)=>String.fromCharCode(65+i));
const rangosS=Object.values(FILAS_ACARREOS).map(f=>"'AtrásRDA'!S"+f[0]+':S'+f.at(-1)).join(',');
const rangosB=Object.values(FILAS_ACARREOS).map(f=>"'AtrásRDA'!B"+f[0]+':B'+f.at(-1)).join(',');
export function formulaProduccionAcarreo() {
  // Si una capacidad o distancia se borra en Excel, no se muestra un total
  // parcial como si fuera la producción completa del día.
  return 'IF(AND(OR(E13=533,E13="533",E13=534,E13="534"),COUNT('+rangosS+')>0,COUNT('+rangosS+')=COUNTA('+rangosB+')),SUM('+rangosS+'),"")';
}
export function valoresReversoExcel(b,catalogos,filasEquipos) {
  const valores={};
  for(const filas of Object.values(FILAS_ACARREOS))for(const fila of filas) {
    for(const columna of columnas)valores[columna+fila]='';
    valores['S'+fila]={formula:'IF(OR(C'+fila+'="",F'+fila+'=""),"",ROUND(C'+fila+'*F'+fila+'*COUNTIFS(G'+fila+':R'+fila+',"X"),2))',valor:null};
  }
  for(const {id,registro:r,fila} of filasAcarreos(b)) {
    if(fila===undefined)throw new Error('El acarreo no cabe en el reverso.');
    const equipo=equipoDelReporte(b,id,catalogos),frente=filasEquipos[b.equipos.findIndex(f=>f.id===id)];
    valores['A'+fila]={formula:'TEXT(\'FrenteRDA\'!Z'+frente+',"000")',valor:codigoParticipante(r)};
    valores['B'+fila]={formula:'\'FrenteRDA\'!AA'+frente+'&"-"&\'FrenteRDA\'!AC'+frente,valor:equipo.codigoEquipo+'-'+equipo.numeroEquipo};
    valores['C'+fila]=Number(r.capacidadTexto.trim().replace(',','.'));
    valores['D'+fila]=lineasTextoAcarreo(r.fuente,'fuente').join('\n');
    valores['E'+fila]=lineasTextoAcarreo(r.material,'material').join('\n');
    valores['F'+fila]=enteroAcarreo(r.longitudTexto);
    r.viajes.forEach((marcado,i)=>{valores[String.fromCharCode(71+i)+fila]=marcado?'X':'';});
    valores['S'+fila].valor=subtotalAcarreo(r);
  }
  return valores;
}
export function prepararFilaReverso(hoja) {
  // Las nueve filas del último bloque están presentes en la plantilla actual.
  // Se comprueban antes de rellenar para no omitir un equipo silenciosamente.
  for(const columna of columnas)if(!new RegExp('<c\\b[^>]*\\br="'+columna+'43"').test(hoja))
    throw new Error('Falta la última fila de otros participantes en la plantilla.');
  return hoja;
}
export function formatoReversoExcel(archivos,utf8,b) {
  const reverso=archivos.find(f=>f.nombre==='xl/worksheets/sheet2.xml');
  const frente=archivos.find(f=>f.nombre==='xl/worksheets/sheet1.xml');
  const estilos=archivos.find(f=>f.nombre==='xl/styles.xml');
  let hoja=new TextDecoder().decode(reverso.bytes),style=new TextDecoder().decode(estilos.bytes);
  const numFmts=style.match(/<numFmts\b([^>]*)>([\s\S]*?)<\/numFmts>/);
  const fonts=style.match(/<fonts\b([^>]*)>([\s\S]*?)<\/fonts>/),originalFonts=fonts[2].match(/<font\b[^>]*>[\s\S]*?<\/font>/g);
  const fontTexto=originalFonts.length;
  // Fuente y material usan 14 puntos sin negrita. El texto se distribuye
  // en hasta dos líneas, conservando las alturas y los demás formatos.
  const compacto=originalFonts[17].replace(/<sz\b[^>]*\/>/,'<sz val="14"/>').replace(/<b\b[^>]*\/>/g,'');
  style=style.replace(fonts[0],'<fonts'+fonts[1].replace(/count="\d+"/,'count="'+(originalFonts.length+1)+'"')+'>'+fonts[2]+compacto+'</fonts>');
  const idFormato=Math.max(163,...Array.from(style.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"/g),m=>Number(m[1])))+1;
  const precision=Math.max(2,...filasAcarreos(b).map(({registro:r})=>(r.capacidadTexto.trim().replace(',','.').split('.')[1]??'').length));
  const nuevoFormato='<numFmt numFmtId="'+idFormato+'" formatCode="0.00'+'#'.repeat(Math.max(8,precision-2))+'"/>';
  if(numFmts)style=style.replace(numFmts[0],'<numFmts'+numFmts[1].replace(/count="\d+"/,'count="'+(Number(numFmts[1].match(/count="(\d+)"/)[1])+1)+'"')+'>'+numFmts[2]+nuevoFormato+'</numFmts>');
  else style=style.replace(/<fonts\b/,'<numFmts count="1">'+nuevoFormato+'</numFmts><fonts');
  const seccion=style.match(/<cellXfs\b([^>]*)>([\s\S]*?)<\/cellXfs>/);
  const originales=seccion[2].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g),nuevos=[],mapa=new Map();
  function ajustar(xml,ref,formato,envolver=false,alineacion='center') {
    const re=new RegExp('<c\\b([^>]*\\br="'+ref+'"[^>]*?)(\\s*/?>)'),captura=xml.match(re);
    const id=Number(captura?.[1].match(/\bs="(\d+)"/)?.[1]),clave=[id,formato,envolver,alineacion].join('-');
    if(!originales[id])throw new Error('Falta el formato de '+ref+'.');
    if(!mapa.has(clave)) {
      let xf=originales[id];
      if(envolver)xf=xf.replace(/\bfontId="\d+"/,'fontId="'+fontTexto+'"');
      xf=xf.replace(/^<xf\b([^>]*?)(\/?>)/,(_,atributos,fin)=>'<xf'+atributos.replace(/\s+(numFmtId|applyNumberFormat|applyAlignment)="[^"]*"/g,'')+' numFmtId="'+formato+'" applyNumberFormat="1" applyAlignment="1"'+fin);
      const alignment='<alignment horizontal="'+alineacion+'" vertical="center" wrapText="'+(envolver?1:0)+'" shrinkToFit="'+(envolver?0:1)+'"/>';
      if(/<alignment\b[^>]*\/>/.test(xf))xf=xf.replace(/<alignment\b[^>]*\/>/,alignment);
      else if(xf.endsWith('/>'))xf=xf.slice(0,-2)+'>'+alignment+'</xf>';
      else xf=xf.replace('</xf>',alignment+'</xf>');
      mapa.set(clave,originales.length+nuevos.length);nuevos.push(xf);
    }
    return xml.replace(re,(_,attrs,fin)=>'<c'+attrs.replace(/\bs="\d+"/,'s="'+mapa.get(clave)+'"')+fin);
  }
  for(const filas of Object.values(FILAS_ACARREOS))for(const fila of filas)for(const columna of columnas) {
    const formato=columna==='C'?idFormato:columna==='F'?1:columna==='S'?2:49;
    hoja=ajustar(hoja,columna+fila,formato,['D','E'].includes(columna));
  }
  frente.bytes=utf8(ajustar(new TextDecoder().decode(frente.bytes),'AD11',2,false,'right'));
  style=style.replace(seccion[0],'<cellXfs'+seccion[1].replace(/count="\d+"/,'count="'+(originales.length+nuevos.length)+'"')+'>'+seccion[2]+nuevos.join('')+'</cellXfs>');
  const rangos=columna=>Object.values(FILAS_ACARREOS).map(f=>columna+f[0]+':'+columna+f.at(-1)).join(' ');
  const viajes=Object.values(FILAS_ACARREOS).map(f=>'G'+f[0]+':R'+f.at(-1)).join(' ');
  // En Excel cada viaje se marca con X, con una lista desplegable; la fórmula
  // cuenta las marcas, no el número del encabezado ni la última casilla usada.
  const validaciones='<dataValidations count="3">'+
    '<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Viaje" error="Marca X o deja vacío." sqref="'+viajes+'"><formula1>"X"</formula1></dataValidation>'+
    '<dataValidation type="decimal" operator="greaterThanOrEqual" allowBlank="1" showErrorMessage="1" sqref="'+rangos('C')+'"><formula1>0</formula1></dataValidation>'+
    '<dataValidation type="whole" operator="greaterThanOrEqual" allowBlank="1" showErrorMessage="1" sqref="'+rangos('F')+'"><formula1>0</formula1></dataValidation></dataValidations>';
  hoja=hoja.replace(/<printOptions\b|<pageMargins\b|<\/worksheet>/,m=>validaciones+m);
  reverso.bytes=utf8(hoja);estilos.bytes=utf8(style);
}
