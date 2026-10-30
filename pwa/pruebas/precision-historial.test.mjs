import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {nuevoEncabezado,crearCatalogos,generarExcel,agregarPersonal,agregarEquipo,produccionExactaDelReporte} from '../core.mjs';
import {nuevoConjunto,leerConjunto,numerar} from '../continuacion.mjs';
import {generarExcelConjunto} from '../excel-conjunto.mjs';
import {agregarAcarreo,actualizarAcarreo,totalExactoAcarreos,subtotalExactoAcarreo} from '../acarreos-reglas.mjs';
import {decimalParaExcel,sumarDecimales,multiplicarDecimal} from '../decimales.mjs';
import {tieneContenido,crearHistorial} from '../historial.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url))),cat=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const base=()=>({...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:'280'});
function unzip(bytes){let p=0;const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};while(v.getUint32(p,true)===0x04034b50){const tam=v.getUint32(p+18,true),n=v.getUint16(p+26,true),e=v.getUint16(p+28,true),s=p+30+n+e;out[new TextDecoder().decode(bytes.slice(p+30,p+30+n))]=new TextDecoder().decode(bytes.slice(s,s+tam));p=s+tam;}return out;}
const celda=(xml,ref)=>xml.match(new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*(?:/>|>[\\s\\S]*?</c>)'))[0];
function acarreo(capacidades){let b={...base(),codigoActividad:'533'};const equipos=datos.equipos.filter(e=>e.codigoEquipo==='232').slice(0,capacidades.length);for(const [i,capacidadTexto]of capacidades.entries()){b=agregarPersonal(b,datos.personal[i].id,cat);b=agregarEquipo(b,equipos[i].id,cat);b=agregarAcarreo(b,equipos[i].id);b=actualizarAcarreo(b,equipos[i].id,{capacidadTexto,longitudTexto:'1',viajes:[true,...Array(11).fill(false)]});}return b;}

test('La producción conserva todos los decimales, incluido cero y ceros finales, en el Excel oficial',()=>{
 for(const [texto,numero,formato]of[['12,67891','12.67891','0.00000'],['0.00000125','0.00000125','0.00000000'],['1,2300','1.23','0.0000'],['0','0','0']]){
  const b={...base(),produccionTexto:texto},z=unzip(generarExcel(plantilla,b,cat)),h=z['xl/worksheets/sheet1.xml'];
  assert.equal(produccionExactaDelReporte(b),texto.replace(',','.'));assert.ok(celda(h,'AD11').includes('<v>'+numero+'</v>'));assert.ok(z['xl/styles.xml'].includes('formatCode="'+formato+'"'));
 }
});
test('Una medida con más de 15 cifras significativas queda literal para que Excel no pierda cifras',()=>{
 const texto='0,12345678901234567890123456789',b={...base(),produccionTexto:texto},z=unzip(generarExcel(plantilla,b,cat)),c=celda(z['xl/worksheets/sheet1.xml'],'AD11');
 assert.equal(decimalParaExcel(texto),texto);assert.ok(c.includes('t="inlineStr"'));assert.ok(c.includes(texto));assert.ok(!c.includes('<f>'));
});
test('Los acarreos suman 0,004 y 0,005 como 0,009 y las fórmulas editables no redondean',()=>{
 const b=acarreo(['0,004','0,005']);assert.equal(totalExactoAcarreos(b),'0.009');
 assert.equal(subtotalExactoAcarreo(b.acarreos[b.equipos[0].id]),'0.004');
 const z=unzip(generarExcel(plantilla,b,cat));assert.ok(celda(z['xl/worksheets/sheet1.xml'],'AD11').includes('<v>0.009</v>'));
 assert.ok(celda(z['xl/worksheets/sheet2.xml'],'S4').includes('<v>0.004</v>'));assert.ok(!z['xl/worksheets/sheet2.xml'].includes('ROUND('));
 assert.equal(sumarDecimales(['0.1','0.2']),'0.3');assert.equal(multiplicarDecimal('12.67891',90,3),'3423.30570');
});
test('Una capacidad extensa conserva también el subtotal y la producción al abrir el Excel',()=>{
 const b=acarreo(['0,1234567890123456789']),z=unzip(generarExcel(plantilla,b,cat));
 for(const [hoja,ref]of[['sheet1','AD11'],['sheet2','C4'],['sheet2','S4']]){const c=celda(z['xl/worksheets/'+hoja+'.xml'],ref);assert.ok(c.includes('0,1234567890123456789'));assert.ok(!c.includes('<f>'));}
});
test('Un acarreo vacío mantiene las fórmulas para completarlo posteriormente en Excel',()=>{
 const z=unzip(generarExcel(plantilla,{...base(),codigoActividad:'533'},cat));assert.ok(celda(z['xl/worksheets/sheet1.xml'],'AD11').includes('<f>'));assert.ok(!z['xl/worksheets/sheet2.xml'].includes('ROUND('));
});
test('Cada continuación conserva su producción y su precisión al reunir el libro',()=>{
 const c=numerar({...nuevoConjunto(base()),reportes:[{...base(),produccionTexto:'12,34567'},{...base(),produccionTexto:'3,001'}]}),z=unzip(generarExcelConjunto(plantilla,c.reportes,cat));
 assert.ok(celda(z['xl/worksheets/sheet1.xml'],'AD11').includes('<v>12.34567</v>'));assert.ok(celda(z['xl/worksheets/sheet3.xml'],'AD11').includes('<v>3.001</v>'));
});
test('El historial omite conjuntos vacíos y la recuperación conserva identidad y producción literal',async()=>{
 assert.equal(tieneContenido(nuevoConjunto()),false);const c={...nuevoConjunto({...base(),produccionTexto:'0,1234567890123456789'}),historialId:'reporte-de-prueba'};assert.equal(tieneContenido(c),true);assert.deepEqual(leerConjunto(JSON.stringify(c)),c);
 await assert.rejects(crearHistorial(null).listar(),/no permite/);
});
