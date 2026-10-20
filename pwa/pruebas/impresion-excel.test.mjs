import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,generarExcel,agregarPersonal,agregarEquipo} from '../core.mjs';

const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const catalogos=crearCatalogos(datos);
const plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const original=Object.fromEntries(plantilla.map(f=>[f.nombre,Buffer.from(f.base64,'base64').toString('utf8')]));
const seccion=(xml,nombre)=>xml.match(new RegExp('<'+nombre+'\\b[^>]*>[\\s\\S]*?</'+nombre+'>'))[0];
function archivos(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};let p=0;
  while(view.getUint32(p,true)===0x04034b50) {
    const tam=view.getUint32(p+18,true),nom=view.getUint16(p+26,true),extra=view.getUint16(p+28,true),inicio=p+30+nom+extra;
    out[new TextDecoder().decode(bytes.slice(p+30,p+30+nom))]=new TextDecoder().decode(bytes.slice(inicio,inicio+tam));p=inicio+tam;
  }
  return out;
}
function ejemplo(cantidad,actividad='280') {
  let b={...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:actividad,numeroReporteTexto:'1 / 1'};
  for(const persona of datos.personal.slice(0,cantidad))b=agregarPersonal(b,persona.id,catalogos);
  for(const equipo of datos.equipos.filter(e=>e.codigoEquipo==='232'&&e.numeroEquipo).slice(0,cantidad))b=agregarEquipo(b,equipo.id,catalogos);
  return archivos(generarExcel(plantilla,b,catalogos));
}
function formatoBorde(h,hoja,ref) {
  const celda=h[hoja].match(new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*>'))[0];
  const xfs=seccion(h['xl/styles.xml'],'cellXfs').match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
  const xf=xfs[Number(celda.match(/\bs="(\d+)"/)[1])];
  const bordes=seccion(h['xl/styles.xml'],'borders').match(/<border\b[^>]*>[\s\S]*?<\/border>/g);
  assert.match(xf,/applyBorder="1"/);
  return bordes[Number(xf.match(/\bborderId="(\d+)"/)[1])];
}
test('El Excel refuerza sólo los trazos existentes y conserva colores, fuentes y formatos',()=>{
  const h=ejemplo(1),antes=seccion(original['xl/styles.xml'],'borders'),despues=seccion(h['xl/styles.xml'],'borders');
  assert.ok(antes.includes('style="thin"'));assert.ok(!despues.includes('style="thin"'));
  // No se crean cuadrículas en espacios sin borde ni líneas en diagonales.
  const trazos=xml=>[...xml.matchAll(/<(left|right|top|bottom|diagonal)\b([^>]*)>/g)].map(([,lado,attrs])=>[lado,/\bstyle=/.test(attrs)]);
  assert.deepEqual(trazos(despues),trazos(antes));
  assert.deepEqual(despues.match(/<color\b[^>]*\/>/g),antes.match(/<color\b[^>]*\/>/g));
  for(const n of ['fonts','fills','cellStyleXfs','cellStyles','numFmts'])
    assert.equal(seccion(h['xl/styles.xml'],n),seccion(original['xl/styles.xml'],n),n);
  assert.ok(h['xl/styles.xml'].includes(seccion(original['xl/styles.xml'],'cellXfs').replace(/^<cellXfs[^>]*>|<\/cellXfs>$/g,'')));
});
test('Todas las filas de Personal y Equipo mantienen su borde horizontal, con cierre y casillas vacías',()=>{
  for(const cantidad of [0,1,11]) {
    const h=ejemplo(cantidad),frente='xl/worksheets/sheet1.xml';
    for(let fila=22;fila<=33;fila++)for(const col of ['B','C','E','J','R','S','U','V','W','X','Z','AA','AC','AE','AG','AH'])
      assert.match(formatoBorde(h,frente,col+fila),/<bottom style="(?:medium|thick)">/,cantidad+': '+col+fila);
    const cierre=22+cantidad;
    assert.ok(h[frente].includes('ref="B'+cierre+':X'+cierre+'"'));
    assert.ok(h[frente].includes('ref="Z'+cierre+':AH'+cierre+'"'));
    assert.equal((h[frente].match(/Última línea/g)??[]).length,2);
  }
});
test('Las 27 filas del reverso y sus 12 casillas de viaje tienen bordes imprimibles, incluso sin acarreo',()=>{
  for(const actividad of ['280','533']) {
    const h=ejemplo(1,actividad),reverso='xl/worksheets/sheet2.xml';
    for(const inicio of [4,22,35])for(let f=inicio;f<inicio+9;f++)for(let c=65;c<=83;c++)
      assert.match(formatoBorde(h,reverso,String.fromCharCode(c)+f),/<bottom style="(?:medium|thick)">/,actividad+': '+String.fromCharCode(c)+f);
  }
});
test('Las dos caras usan carta, margen seguro, calidad normal y ajuste a una página sin escala contradictoria',()=>{
  const h=ejemplo(11,'533');
  for(const hoja of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml']) {
    const xml=h[hoja],setup=xml.match(/<pageSetup\b[^>]*\/>/)[0],margenes=xml.match(/<pageMargins\b[^>]*\/>/)[0];
    for(const [k,v] of Object.entries({paperSize:1,orientation:'portrait',fitToWidth:1,fitToHeight:1,usePrinterDefaults:0,draft:0,horizontalDpi:600,verticalDpi:600}))
      assert.ok(setup.includes(k+'="'+v+'"'),hoja+': '+k);
    assert.ok(!/\bscale=/.test(setup));
    for(const k of ['left','right','top','bottom'])assert.ok(Number(margenes.match(new RegExp('\\b'+k+'="([^"]+)"'))[1])>=.25);
    assert.match(xml,/<printOptions\b[^>]*gridLines="0"/);
    assert.equal(seccion(xml,'cols'),seccion(original[hoja],'cols'));
    assert.equal((xml.match(/<row\b/g)??[]).length,(original[hoja].match(/<row\b/g)??[]).length);
  }
  assert.equal(h['xl/workbook.xml'],original['xl/workbook.xml']);
  assert.ok(h['xl/workbook.xml'].includes('$B$1:$AH$64'));assert.ok(h['xl/workbook.xml'].includes('$A$1:$S$45'));
});
