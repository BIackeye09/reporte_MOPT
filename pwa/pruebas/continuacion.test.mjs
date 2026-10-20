import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,agregarEquipo,actualizarHorasPersonal,retirarPersonal} from '../core.mjs';
import {nuevoConjunto,leerConjunto,agregarTrabajador,actualizarReporte,quitarContinuacion} from '../continuacion.mjs';
import {generarExcelConjunto} from '../excel-conjunto.mjs';
import {agregarAcarreo,actualizarAcarreo} from '../acarreos-reglas.mjs';
import {generarPdfConjunto} from '../pdf.mjs';
import {PDFDocument} from '../vendor/pdf-lib.min.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const cat=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
// Identidades ficticias: las pruebas no dependen de trabajadores concretos.
const entrada=i=>({datos:{nombre:'Persona de prueba '+i,cedula:'0-0000-'+String(i).padStart(4,'0'),codigo:'01'}});
const crear=n=>{let c=nuevoConjunto({...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:'280'});for(let i=1;i<=n;i++)c=agregarTrabajador(c,entrada(i),cat);return c;};
function unzip(bytes){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};let p=0;while(v.getUint32(p,true)===0x04034b50){const t=v.getUint32(p+18,true),n=v.getUint16(p+26,true),e=v.getUint16(p+28,true),s=p+30+n+e;out[new TextDecoder().decode(bytes.slice(p+30,p+30+n))]=new TextDecoder().decode(bytes.slice(s,s+t)).replaceAll("&apos;", "'");p=s+t;}return out;}
test('11 trabajadores caben; el 12 y el 23 abren continuaciones con encabezado compartido y datos independientes',()=>{
 let c=crear(11);assert.equal(c.reportes.length,1);
 const id=c.reportes[0].personal[0];let b=actualizarHorasPersonal(c.reportes[0],id,{ordinarias:'8'});
 b={...b,produccionTexto:'25',estacionamientoInicioTexto:'4,5',estacionamientoFinalTexto:'9,87',observaciones:'Sólo primero',problema:'S'};c=actualizarReporte(c,b);
 c=agregarTrabajador(c,entrada(12),cat);assert.equal(c.activo,0);assert.deepEqual(c.reportes.map(b=>b.numeroReporteTexto),['1 / 2','2 / 2']);
 assert.equal(c.reportes[0].horasPersonal[id].ordinarias,'8');assert.equal(c.reportes[1].estacionamientoInicioTexto,'4,5');assert.equal(c.reportes[1].estacionamientoFinalTexto,'9,87');
 for(const k of ['produccionTexto','senasInicio','problema','longitudTexto','observaciones'])assert.equal(c.reportes[1][k],'');
 for(const k of ['equipos','materiales','equiposManuales'])assert.deepEqual(c.reportes[1][k],[]);assert.deepEqual(c.reportes[1].acarreos,{});
 for(let i=13;i<=23;i++)c=agregarTrabajador(c,entrada(i),cat);
 assert.deepEqual(c.reportes.map(b=>b.personal.length),[11,11,1]);assert.deepEqual(c.reportes.map(b=>b.numeroReporteTexto),['1 / 3','2 / 3','3 / 3']);
 const cambio=actualizarReporte(c,{...c.reportes[c.activo],fechaTexto:'17/10/2026',fecha:'2026-10-17'});assert.ok(cambio.reportes.every(b=>b.fecha==='2026-10-17'));assert.equal(cambio.reportes[0].observaciones,'Sólo primero');
 assert.deepEqual(leerConjunto(JSON.stringify(cambio)),cambio);
});
test('Un duplicado no abre hoja; catálogo y manual comparten la misma continuación automática',()=>{
 let c=crear(11);const antes=JSON.stringify(c);assert.throws(()=>agregarTrabajador(c,entrada(1),cat),/reporte 1/);assert.equal(JSON.stringify(c),antes);
 c=agregarTrabajador(c,{id:datos.personal[0].id},cat);assert.equal(c.reportes[1].personal[0],datos.personal[0].id);
 assert.throws(()=>agregarTrabajador(c,{id:datos.personal[0].id},cat),/reporte 2/);
 const viejo=c.reportes[0];assert.deepEqual(leerConjunto(JSON.stringify(viejo)).reportes[0],{...viejo,numeroReporteTexto:'1 / 1'});
});
test('Volver a una hoja llena usa la siguiente con espacio; quitar sólo permite continuaciones vacías',()=>{
 let c=crear(12);assert.throws(()=>quitarContinuacion(c),/vacía/);
 c={...c,activo:0};c=agregarTrabajador(c,entrada(13),cat);assert.equal(c.reportes.length,2);assert.equal(c.activo,0);
 c={...c,activo:1};for(const id of [...c.reportes[1].personal])c=actualizarReporte(c,retirarPersonal(c.reportes[1],id));
 c=quitarContinuacion(c);assert.equal(c.reportes.length,1);assert.equal(c.reportes[0].numeroReporteTexto,'1 / 1');
});
test('Excel mantiene seis hojas, seis áreas de impresión y fórmulas de acarreo aisladas por reporte',()=>{
 let c=crear(23);c=actualizarReporte(c,{...c.reportes[c.activo],codigoActividad:'533'});
 const equipos=datos.equipos.filter(f=>f.codigoEquipo&&f.numeroEquipo);
 for(let i=0;i<3;i++){
  c={...c,activo:i};let b=agregarEquipo(c.reportes[i],equipos[i].id,cat);b=agregarAcarreo(b,equipos[i].id);
  b=actualizarAcarreo(b,equipos[i].id,{capacidadTexto:String(12+i),longitudTexto:'90',fuente:'Fuente '+i,material:'Material '+i,viajes:[true,...Array(11).fill(false)]});c=actualizarReporte(c,b);
 }
 const z=unzip(generarExcelConjunto(plantilla,c.reportes,cat));assert.equal((z['xl/workbook.xml'].match(/<sheet /g)||[]).length,6);
 assert.equal((z['xl/workbook.xml'].match(/_xlnm.Print_Area/g)||[]).length,6);
 for(let i=0;i<3;i++){
  assert.ok(z['xl/worksheets/sheet'+(2*i+1)+'.xml'].includes("'AtrásRDA_"+(i+1)+"'!"));
  assert.ok(z['xl/worksheets/sheet'+(2*i+2)+'.xml'].includes("'FrenteRDA_"+(i+1)+"'!"));
  assert.ok(z['xl/worksheets/_rels/sheet'+(2*i+1)+'.xml.rels'].includes('drawing'+(i+1)+'.xml'));
 }
 assert.throws(()=>generarExcelConjunto(plantilla,[{...c.reportes[0],codigoCamino:null}],cat),/encabezado/);
});
test('PDF conserva frente y reverso carta para los tres reportes',async()=>{
 const png=fs.readFileSync(new URL('../icons/icono-192.png',import.meta.url));const original=fs.readFileSync(new URL('../assets/reverso-original.pdf',import.meta.url));
 const doc=await PDFDocument.load(await generarPdfConjunto(Array.from({length:3},()=>({frentePng:png,datosReversoPng:null})),original));
 assert.equal(doc.getPageCount(),6);assert.ok(doc.getPages().every(p=>p.getWidth()===612&&p.getHeight()===792));
});
