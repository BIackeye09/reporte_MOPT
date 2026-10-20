import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {nuevoEncabezado,crearCatalogos,buscarPersonal,agregarPersonal,actualizarHorasPersonal,erroresHoras,nuevasHoras,totalHoras,valoresCeldas,generarExcel,leerBorrador,errorInspector} from '../core.mjs';
import {nuevoConjunto,agregarTrabajador,actualizarReporte,leerConjunto} from '../continuacion.mjs';
import {senasInicioDelReporte,avanceDelReporte,erroresEstacionamientos} from '../estacionamientos.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url))),cat=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const base=()=>({...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:'280'});
const unzip=bytes=>{let p=0;const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};while(v.getUint32(p,true)===0x04034b50){const tam=v.getUint32(p+18,true),n=v.getUint16(p+26,true),e=v.getUint16(p+28,true),s=p+30+n+e;out[new TextDecoder().decode(bytes.slice(p+30,p+30+n))]=new TextDecoder().decode(bytes.slice(s,s+tam));p=s+tam;}return out;};
test('TRAS. admite una hora, decimales desde una hora, cero y vacío y mantiene el total',()=>{
 for(const traslado of ['','0','1','1,25','1.99','2'])assert.deepEqual(erroresHoras({...nuevasHoras(),traslado}),{});
 for(const traslado of ['0,5','0.99','-1','1h'])assert.ok(erroresHoras({...nuevasHoras(),traslado}).traslado);
 assert.equal(totalHoras({...nuevasHoras(),ordinarias:'7',traslado:'1'}),8);
 let b=agregarPersonal(base(),'personal-538',cat);b=actualizarHorasPersonal(b,'personal-538',{ordinarias:'7',traslado:'1'});const v=valoresCeldas(b,cat);assert.equal(v.U22,1);assert.equal(v.X22,8);
});
test('Sin estaciones no se imprime texto; cero es una estación real y una estación parcial exige completar',()=>{
 for(const [inicio,fin] of [['',''],['  ',' ']]){const b={...base(),estacionamientoInicioTexto:inicio,estacionamientoFinalTexto:fin};assert.equal(senasInicioDelReporte(b),'');assert.equal(avanceDelReporte(b),null);assert.deepEqual(erroresEstacionamientos(b),{});assert.equal(valoresCeldas(b,cat).D14,'');}
 const b={...base(),estacionamientoInicioTexto:'0',estacionamientoFinalTexto:'1'};assert.equal(senasInicioDelReporte(b),'Estacionamiento 0 + 000 al 1 + 000');assert.equal(avanceDelReporte(b),1);
 assert.ok(erroresEstacionamientos({...base(),estacionamientoInicioTexto:'1'})['estacionamiento-final']);
 for(const codigoActividad of ['533','534'])assert.equal(senasInicioDelReporte({...b,codigoActividad}),'');
});
test('Inspector compartido, editable y recuperado con migración del conjunto 2 y del borrador 11',()=>{
 let c=nuevoConjunto({...base(),inspectorTexto:'Grechen Calderón'});for(let i=1;i<=12;i++)c=agregarTrabajador(c,{datos:{nombre:'Persona parche '+i,cedula:'0-0000-'+String(i).padStart(4,'0'),codigo:'01'}},cat);
 assert.ok(c.reportes.every(b=>b.inspectorTexto==='Grechen Calderón'));c={...c,activo:1};c=actualizarReporte(c,{...c.reportes[1],inspectorTexto:'Otra inspectora'});assert.ok(c.reportes.every(b=>b.inspectorTexto==='Otra inspectora'));assert.deepEqual(leerConjunto(JSON.stringify(c)),c);
 const viejo={...base(),version:11};delete viejo.inspectorTexto;const antiguo={tipo:'mopt.conjunto',version:2,activo:0,reportes:[viejo],estacionesPrevias:[]};assert.equal(leerBorrador(JSON.stringify(viejo)).inspectorTexto,'');assert.equal(leerConjunto(JSON.stringify(antiguo)).version,3);assert.equal(leerConjunto(JSON.stringify(antiguo)).reportes[0].inspectorTexto,'');
 for(const t of ['Grechen Calderón','',"=Nombre & <texto>"])assert.equal(errorInspector(t),'');for(const t of ['X'.repeat(101),'Nombre\nOtro'])assert.ok(errorInspector(t));
});
test('Inspector ocupa U45 sin alterar la etiqueta U46 ni las casillas de firma vecinas',()=>{
 for(const inspectorTexto of ['Grechen Calderón','=Nombre & <texto>','']){
 const b={...base(),inspectorTexto};const z=unzip(generarExcel(plantilla,b,cat));const h=z['xl/worksheets/sheet1.xml'];assert.equal(valoresCeldas(b,cat).U45,inspectorTexto);assert.ok(h.includes('ref="U45:AG45"'));assert.ok(h.includes('r="U46"'));if(inspectorTexto)assert.ok(/<c\b[^>]*r="U45"[^>]*t="inlineStr"/.test(h));
 }
});
test('Manuel Cascante tiene un único registro con cédula, código 09 y regional V Heredia',()=>{
 const filas=datos.personal.filter(p=>p.cedula==='1-1325-0454');assert.equal(filas.length,1);const m=filas[0];assert.equal(m.nombre,'Manuel Cascante');assert.equal(m.codigo,'09');assert.equal(m.part,'000');assert.equal(m.regional,'V Heredia');assert.equal(datos.metadata.cantidades.personal,datos.personal.length);
 for(const q of ['Manuel Cascante','113250454','1-1325-0454'])assert.ok(buscarPersonal(cat,q,'V Heredia').some(p=>p.id===m.id));assert.ok(buscarPersonal(cat,'09','V Heredia').some(p=>p.id===m.id));
 const b=agregarPersonal(base(),m.id,cat),v=valoresCeldas(b,cat);assert.equal(v.C22,'09');assert.equal(v.E22,'1-1325-0454');assert.equal(v.J22,'Manuel Cascante');
});

test('Sin justificar permite horas no trabajadas y exporta JUST. vacía sin cambiar la cantidad ni el total',()=>{
 assert.deepEqual(erroresHoras({...nuevasHoras(),noTrabajadas:'1',justificacion:''}),{});
 assert.ok(erroresHoras({...nuevasHoras(),noTrabajadas:'1',justificacion:'99'}).justificacion);
 let b=agregarPersonal(base(),'personal-538',cat);b=actualizarHorasPersonal(b,'personal-538',{ordinarias:'7',noTrabajadas:'1',justificacion:''});const v=valoresCeldas(b,cat);assert.equal(v.V22,1);assert.equal(v.W22,'');assert.equal(v.X22,8);
 const h=unzip(generarExcel(plantilla,b,cat))['xl/worksheets/sheet1.xml'];assert.ok(/<c\b[^>]*r="W22"[^>]*\/>/.test(h));assert.ok(!h.includes('Sin justificar'));
 b=actualizarHorasPersonal(b,'personal-538',{noTrabajadas:'',justificacion:''});const vacio=valoresCeldas(b,cat);assert.equal(vacio.V22,null);assert.equal(vacio.W22,'');
});
