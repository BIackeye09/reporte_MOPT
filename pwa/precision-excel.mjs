import {admiteNumeroExcel,escalaDecimal} from './decimales.mjs';

// Sólo cambia el formato numérico de Producción. Conserva la fuente,
// alineación, bordes, tamaño y combinaciones de la plantilla oficial.
export function formatoProduccionExcel(archivos,utf8,texto) {
  const frente=archivos.find(f=>f.nombre==='xl/worksheets/sheet1.xml');
  const estilos=archivos.find(f=>f.nombre==='xl/styles.xml');
  let hoja=new TextDecoder().decode(frente.bytes),xml=new TextDecoder().decode(estilos.bytes);
  let formato=49;
  if(texto===null||admiteNumeroExcel(texto)) {
    formato=Math.max(163,...Array.from(xml.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"/g),m=>Number(m[1])))+1;
    const n=escalaDecimal(texto),nuevo='<numFmt numFmtId="'+formato+'" formatCode="0'+(texto===null?'.'+'#'.repeat(30):n?'.'+'0'.repeat(n):'')+'"/>';
    const existentes=xml.match(/<numFmts\b([^>]*)>([\s\S]*?)<\/numFmts>/);
    if(existentes)xml=xml.replace(existentes[0],'<numFmts'+existentes[1].replace(/count="\d+"/,'count="'+(Number(existentes[1].match(/count="(\d+)"/)[1])+1)+'"')+'>'+existentes[2]+nuevo+'</numFmts>');
    else xml=xml.replace('<fonts','<numFmts count="1">'+nuevo+'</numFmts><fonts');
  }
  const celda=hoja.match(/<c\b([^>]*\br="AD11"[^>]*?)(\s*\/?>)/);
  const seccion=xml.match(/<cellXfs\b([^>]*)>([\s\S]*?)<\/cellXfs>/);
  const originales=seccion[2].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
  const origen=originales[Number(celda[1].match(/\bs="(\d+)"/)[1])];
  let nuevo=origen.replace(/\bnumFmtId="\d+"/,'numFmtId="'+formato+'"').replace(/\s+applyNumberFormat="[^"]*"/g,'');
  nuevo=nuevo.replace(/^<xf\b/,'<xf applyNumberFormat="1"');
  if(/<alignment\b/.test(nuevo))nuevo=nuevo.replace(/<alignment\b([^>]*?)(\/?>)/,(_,a,fin)=>'<alignment'+a.replace(/\s+shrinkToFit="[^"]*"/g,'')+' shrinkToFit="1"'+fin);
  xml=xml.replace(seccion[0],'<cellXfs'+seccion[1].replace(/count="\d+"/,'count="'+(originales.length+1)+'"')+'>'+seccion[2]+nuevo+'</cellXfs>');
  hoja=hoja.replace(celda[0],'<c'+celda[1].replace(/\bs="\d+"/,'s="'+originales.length+'"')+celda[2]);
  frente.bytes=utf8(hoja);estilos.bytes=utf8(xml);
}
