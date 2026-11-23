import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,agregarEquipo,guardarEquipoManual,actualizarHorasEquipo,equipoRepetido,errores,valoresCeldas,generarExcel,leerBorrador} from '../core.mjs';
import {datosEquipoManual} from '../registros.mjs';
import {nuevoConjunto,numerar,registrarEquipo,erroresConjunto,leerConjunto} from '../continuacion.mjs';
import {generarExcelConjunto} from '../excel-conjunto.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const cat=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const camion=datos.equipos.find(f=>f.codigoEquipo==='210'&&f.numeroEquipo==='149');
const compactadora=datos.equipos.find(f=>f.codigoEquipo==='115'&&f.numeroEquipo==='149');
const base=()=>({...nuevoEncabezado(),fecha:'2026-11-23',fechaTexto:'23/11/2026',codigoCamino:'4-0771-00',codigoActividad:'280'});
function unzip(bytes){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};let p=0;while(v.getUint32(p,true)===0x04034b50){const t=v.getUint32(p+18,true),n=v.getUint16(p+26,true),e=v.getUint16(p+28,true),s=p+30+n+e;out[new TextDecoder().decode(bytes.slice(p+30,p+30+n))]=new TextDecoder().decode(bytes.slice(s,s+t));p=s+t;}return out;}
const celda=(xml,ref)=>xml.match(new RegExp('<c\\b[^>]*r="'+ref+'"[^>]*?(?:/>|>[\\s\\S]*?</c>)'))[0];

test('El camión 210-149 y la compactadora 115-149 del catálogo caben juntos',()=>{
  assert.ok(camion);assert.ok(compactadora);assert.notEqual(camion.id,compactadora.id);
  const b=agregarEquipo(agregarEquipo(base(),camion.id,cat),compactadora.id,cat);
  assert.equal(b.equipos.length,2);assert.deepEqual(errores(b,cat),{});
  assert.equal(equipoRepetido(camion,compactadora),false);
  assert.throws(()=>agregarEquipo(b,camion.id,cat),/COD.*N.º de equipo/);
});

test('Catálogo y captura manual comparan ambos componentes, también al editar',()=>{
  let b=agregarEquipo(base(),camion.id,cat);
  b=guardarEquipoManual(b,{codigoEquipo:'115',numeroEquipo:'149',descripcion:'Compactadora'},cat);
  const id=b.equipos[1].id;b=actualizarHorasEquipo(b,id,{trabajadas:'4,5'});
  assert.deepEqual(errores(b,cat),{});assert.throws(()=>agregarEquipo(b,compactadora.id,cat),/COD.*N.º de equipo/);
  const antes=JSON.stringify(b);
  assert.throws(()=>guardarEquipoManual(b,{codigoEquipo:'210',numeroEquipo:'00149'},cat,id),/COD.*N.º de equipo/);
  assert.equal(JSON.stringify(b),antes);
  b=guardarEquipoManual(b,{codigoEquipo:'115',numeroEquipo:'149',descripcion:'Compactadora corregida'},cat,id);
  assert.equal(b.equipos[1].id,id);assert.equal(b.horasEquipos[id].trabajadas,'4,5');
});

test('Las continuaciones aceptan el mismo número con otro código y rechazan la pareja repetida',()=>{
  let c=nuevoConjunto(base());c=numerar({...c,reportes:[...c.reportes,base()]});
  c=registrarEquipo(c,{id:camion.id},cat);c={...c,activo:1};c=registrarEquipo(c,{id:compactadora.id},cat);
  assert.deepEqual(erroresConjunto(c,cat),[{},{}]);
  const antes=JSON.stringify(c);
  assert.throws(()=>registrarEquipo(c,{datos:{codigoEquipo:'210',numeroEquipo:'00149'}},cat),/reporte 1 \/ 2/);
  assert.equal(JSON.stringify(c),antes);assert.deepEqual(leerConjunto(JSON.stringify(c)),c);
  assert.doesNotThrow(()=>generarExcelConjunto(plantilla,c.reportes,cat));
});

test('Recuperar y exportar conserva ambos equipos y sus horas en filas distintas',()=>{
  let b=agregarEquipo(agregarEquipo(base(),camion.id,cat),compactadora.id,cat);
  b=actualizarHorasEquipo(b,camion.id,{trabajadas:'8'});b=actualizarHorasEquipo(b,compactadora.id,{trabajadas:'4,5'});
  b=leerBorrador(JSON.stringify(b));const valores=valoresCeldas(b,cat);
  assert.equal(valores.AA22,'210');assert.equal(valores.AC22,'149');assert.equal(valores.AE22,8);
  assert.equal(valores.AA23,'115');assert.equal(valores.AC23,'149');assert.equal(valores.AE23,4.5);
  const xml=unzip(generarExcel(plantilla,b,cat))['xl/worksheets/sheet1.xml'];
  for(const [ref,texto] of [['AA22','210'],['AC22','149'],['AA23','115'],['AC23','149']])assert.ok(celda(xml,ref).includes('>'+texto+'<'));
});

test('Un borrador con la pareja completa repetida sigue bloqueando las exportaciones',()=>{
  let b=agregarEquipo(base(),camion.id,cat);
  const alias=datosEquipoManual({codigoEquipo:'210',numeroEquipo:'00149'},'manual-equipo-duplicado');
  b={...b,equipos:[...b.equipos,{id:alias.id,part:'000'}],equiposManuales:[alias]};
  const recuperado=leerBorrador(JSON.stringify(b));
  assert.match(errores(recuperado,cat).equipos,/COD.*N.º de equipo/);
  assert.throws(()=>generarExcel(plantilla,recuperado,cat));
  assert.throws(()=>generarExcelConjunto(plantilla,[recuperado],cat));
});

test('Los ceros iniciales no permiten duplicar una pareja ni mezclan códigos distintos',()=>{
  assert.equal(equipoRepetido(camion,{codigoEquipo:'210',numeroEquipo:'00149'}),true);
  assert.equal(equipoRepetido({codigoEquipo:'010',numeroEquipo:'00149'},{codigoEquipo:'10',numeroEquipo:'149'}),true);
  assert.equal(equipoRepetido(camion,{codigoEquipo:'115',numeroEquipo:'00149'}),false);
  assert.equal(equipoRepetido(camion,{codigoEquipo:'210',numeroEquipo:'1490'}),false);
  assert.equal(equipoRepetido({numeroEquipo:'149'},camion),false);
});
