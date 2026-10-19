import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,guardarPersonalManual,guardarEquipoManual,valoresCeldas} from '../core.mjs';
import {nuevoConjunto,leerConjunto,actualizarReporte,agregarTrabajador,registrarEquipo,erroresConjunto,quitarContinuacion} from '../continuacion.mjs';
const cat=crearCatalogos(JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url))));
const persona=(i,nombre='Persona prueba '+i)=>({nombre,cedula:'0-0000-'+String(i).padStart(4,'0'),codigo:'01'});
const crear=n=>{let c=nuevoConjunto({...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:'280'});for(let i=1;i<=n;i++)c=agregarTrabajador(c,{datos:persona(i)},cat);return c;};
const maquina=(numeroEquipo,codigoEquipo='232')=>({numeroEquipo,codigoEquipo,descripcion:'Vagoneta de prueba'});
test('Las estaciones se comparten en tres hojas y editarlas desde la tercera actualiza sus avances',()=>{
 let c=crear(23);assert.equal(c.activo,0);assert.deepEqual(c.reportes.map(b=>b.personal.length),[11,11,1]);
 c=actualizarReporte(c,{...c.reportes[0],estacionamientoInicioTexto:'4,5',estacionamientoFinalTexto:'9,87'});
 for(const b of c.reportes){assert.equal(valoresCeldas(b,cat).AA16,5.37);assert.equal(valoresCeldas(b,cat).D14,'Estacionamiento 4 + 500 al 9 + 870');}
 c={...c,activo:2};c=actualizarReporte(c,{...c.reportes[2],estacionamientoFinalTexto:'10'});assert.ok(c.reportes.every(b=>valoresCeldas(b,cat).AA16===5.5));assert.deepEqual(leerConjunto(JSON.stringify(c)),c);
});
test('Nombre y cédula son únicos por separado y el código se repite incluso entre continuaciones',()=>{
 let c=crear(12);const antes=JSON.stringify(c);assert.throws(()=>agregarTrabajador(c,{datos:persona(13,'  PÉRSONA   PRUEBA 12 ')},cat),/nombre o esa cédula/);assert.equal(JSON.stringify(c),antes);
 assert.throws(()=>agregarTrabajador(c,{datos:{...persona(12),nombre:'Otro nombre'}},cat),/nombre o esa cédula/);
 c={...c,activo:1};const id=c.reportes[1].personal[0];c=agregarTrabajador(c,{datos:persona(12),editando:id},cat);assert.equal(c.reportes[1].personal[0],id);
 assert.throws(()=>agregarTrabajador(c,{datos:persona(12,'Persona prueba 1'),editando:id},cat),/nombre o esa cédula/);
 assert.equal(c.reportes[1].personalManual[0].codigo,'01');assert.deepEqual(erroresConjunto(c,cat),[{},{}]);
});
test('Número de equipo único con COD y descripción repetibles; también al corregir manuales',()=>{
 let c=crear(12);c=registrarEquipo(c,{datos:maquina('073')},cat);c=registrarEquipo(c,{datos:maquina('074')},cat);
 const id=c.reportes[0].equipos[0].id;c=registrarEquipo(c,{datos:maquina('073'),editando:id},cat);
 assert.throws(()=>registrarEquipo(c,{datos:maquina('074','999'),editando:id},cat),/N.º de equipo/);
 c={...c,activo:1};const antes=JSON.stringify(c);assert.throws(()=>registrarEquipo(c,{datos:maquina('00073','999')},cat),/reporte 1/);assert.equal(JSON.stringify(c),antes);
 c=registrarEquipo(c,{datos:maquina('075')},cat);assert.deepEqual(erroresConjunto(c,cat),[{},{}]);
});
test('Los controles directos y de exportación detectan duplicados de borradores antiguos',()=>{
 let b=nuevoEncabezado();b=guardarPersonalManual(b,persona(1),cat);assert.throws(()=>guardarPersonalManual(b,persona(2,'Persona prueba 1'),cat),/nombre o esa cédula/);
 b=guardarPersonalManual(b,persona(2),cat);b=guardarEquipoManual(b,maquina('073'),cat);assert.throws(()=>guardarEquipoManual(b,maquina('73','999'),cat),/N.º de equipo/);
 let c=crear(12);let segundo=guardarEquipoManual(c.reportes[1],maquina('073','999'),cat);c=registrarEquipo(c,{datos:maquina('73')},cat);c={...c,reportes:[c.reportes[0],segundo]};assert.match(erroresConjunto(c,cat)[1].equipos,/N.º de equipo repetido/);
});
test('La migración toma estaciones del primer reporte y conserva las distintas como referencia',()=>{
 let c=crear(12);c={...c,version:1,reportes:c.reportes.map((b,i)=>({...b,estacionamientoInicioTexto:i?'7':'4,5',estacionamientoFinalTexto:i?'8':'9,87'}))};const n=leerConjunto(JSON.stringify(c));assert.equal(n.version,2);assert.ok(n.reportes.every(b=>b.estacionamientoInicioTexto==='4,5'));
 assert.equal(n.estacionesPrevias[0].estacionamientoInicioTexto,'7');assert.equal(n.estacionesPrevias[0].reporte,2);assert.deepEqual(leerConjunto(JSON.stringify(n)),n);
});
