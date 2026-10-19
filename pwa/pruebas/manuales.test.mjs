import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,leerBorrador,errores,generarExcel,valoresCeldas,
  agregarPersonal,agregarEquipo,guardarPersonalManual,guardarEquipoManual,retirarPersonal,retirarEquipo,
  actualizarHorasPersonal,actualizarHorasEquipo,horasDePersonal,horasDeEquipo,personalDelReporte,equipoDelReporte,
  erroresPersonalManual,erroresEquipoManual,equipoCompleto} from '../core.mjs';
import {agregarAcarreo,actualizarAcarreo,erroresAcarreo} from '../acarreos-reglas.mjs';
import {lineasTextoAcarreo} from '../texto-acarreo.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const catalogos=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const ejemplo=()=>({...nuevoEncabezado(),fecha:'2026-10-15',fechaTexto:'15/10/2026',numeroReporteTexto:'1 / 1',codigoCamino:'4-0771-00',codigoActividad:'280'});
const persona={nombre:'Persona manual de prueba',cedula:'000000001',codigo:'6'};
const equipo={codigoEquipo:'232',numeroEquipo:'0073',descripcion:'Vagoneta de prueba'};
const conManuales=()=>guardarEquipoManual(guardarPersonalManual(ejemplo(),persona,catalogos),equipo,catalogos);
function archivos(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),resultado={};let p=0;
  while(v.getUint32(p,true)===0x04034b50){const n=v.getUint32(p+18,true),a=v.getUint16(p+26,true),extra=v.getUint16(p+28,true),inicio=p+30+a+extra;
    resultado[new TextDecoder().decode(bytes.slice(p+30,p+30+a))]=new TextDecoder().decode(bytes.slice(inicio,inicio+n));p=inicio+n;}
  return resultado;
}
const celda=(xml,ref)=>xml.match(new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*?(?:/>|>[\\s\\S]*?</c>)'))[0];
test('El número de reporte obligatorio también bloquea la exportación directa y conserva el borrador vacío',()=>{
  const b={...ejemplo(),numeroReporteTexto:'  '};assert.match(errores(b,catalogos).numero,/obligatorio/);
  assert.throws(()=>generarExcel(plantilla,b,catalogos));assert.equal(leerBorrador(JSON.stringify(b)).numeroReporteTexto,'  ');
});
test('Equipo no puede superar al personal y retirarlo exige conservar esa relación',()=>{
  const f=datos.equipos.find(equipoCompleto);assert.throws(()=>agregarEquipo(ejemplo(),f.id,catalogos),/más equipos que personal/);
  let b=agregarPersonal(ejemplo(),datos.personal[0].id,catalogos);b=agregarEquipo(b,f.id,catalogos);
  assert.throws(()=>retirarPersonal(b,b.personal[0]),/Retira primero un equipo/);assert.equal(b.personal.length,1);assert.equal(b.equipos.length,1);
  const sinEquipo=retirarEquipo(b,f.id);assert.equal(retirarPersonal(sinEquipo,sinEquipo.personal[0]).personal.length,0);
  const viejo={...b,version:9,personal:[]};const recuperado=leerBorrador(JSON.stringify(viejo));
  assert.equal(recuperado.equipos.length,1);assert.match(errores(recuperado,catalogos).equipos,/más equipos que personal/);assert.throws(()=>generarExcel(plantilla,recuperado,catalogos));
});
test('Los manuales normalizan cédula y códigos, conservan ceros y no cambian el catálogo',()=>{
  const antes=JSON.stringify(datos),b=conManuales(),p=b.personal[0],e=b.equipos[0].id;
  assert.equal(personalDelReporte(b,p,catalogos).cedula,'0-0000-0001');assert.equal(personalDelReporte(b,p,catalogos).codigo,'06');
  assert.equal(equipoDelReporte(b,e,catalogos).numeroEquipo,'0073');assert.deepEqual(errores(b,catalogos),{});
  const v=valoresCeldas(b,catalogos);assert.equal(v.B22,'000');assert.equal(v.E22,'0-0000-0001');assert.equal(v.J22,persona.nombre);assert.equal(v.AC22,'0073');
  assert.equal(JSON.stringify(datos),antes);assert.equal(catalogos.personal.has(p),false);assert.equal(catalogos.equipos.has(e),false);
});
test('La misma cédula o equipo no se duplica al combinar ingreso manual y catálogo',()=>{
  const f=datos.personal.find(p=>/^\d-\d{4}-\d{4}$/.test(p.cedula)),d={...persona,cedula:f.cedula};
  const b=agregarPersonal(ejemplo(),f.id,catalogos);assert.throws(()=>guardarPersonalManual(b,d,catalogos),/ya existe/i);
  const manual=guardarPersonalManual(ejemplo(),d,catalogos);assert.throws(()=>agregarPersonal(manual,f.id,catalogos),/ya existe/i);
  const e=datos.equipos.find(equipoCompleto),c=agregarEquipo(b,e.id,catalogos);
  assert.throws(()=>guardarEquipoManual(c,{codigoEquipo:e.codigoEquipo,numeroEquipo:'0'+e.numeroEquipo},catalogos),/ya existe/i);
  const m=guardarEquipoManual(b,{codigoEquipo:e.codigoEquipo,numeroEquipo:e.numeroEquipo},catalogos);assert.throws(()=>agregarEquipo(m,e.id,catalogos),/ya existe/i);
});
test('Corregir los manuales mantiene IDs, horas y acarreo, y actualiza los identificadores exportados',()=>{
  let b=conManuales();const p=b.personal[0],e=b.equipos[0].id;
  b=actualizarHorasPersonal(b,p,{ordinarias:'8'});b=actualizarHorasEquipo(b,e,{trabajadas:'7,5',traslado:'0,5'});
  b={...b,codigoActividad:'533'};b=agregarAcarreo(b,e);b=actualizarAcarreo(b,e,{capacidadTexto:'12',longitudTexto:'90',fuente:'TAJO PRUEBA',material:'LASTRE',viajes:[true,...Array(11).fill(false)]});
  b=guardarPersonalManual(b,{...persona,nombre:'Persona corregida'},catalogos,p);b=guardarEquipoManual(b,{...equipo,numeroEquipo:'0099'},catalogos,e);
  const r=leerBorrador(JSON.stringify(b));assert.equal(r.version,11);assert.deepEqual(r.personal,[p]);assert.equal(r.equipos[0].id,e);
  assert.equal(horasDePersonal(r,p).ordinarias,'8');assert.equal(horasDeEquipo(r,e).trabajadas,'7,5');assert.equal(r.acarreos[e].viajes[0],true);
  const xml=archivos(generarExcel(plantilla,r,catalogos));assert.ok(celda(xml['xl/worksheets/sheet1.xml'],'J22').includes('Persona corregida'));
  assert.ok(celda(xml['xl/worksheets/sheet2.xml'],'B4').includes('232-0099'));assert.ok(celda(xml['xl/worksheets/sheet2.xml'],'B4').includes('AC22'));
  assert.ok(celda(xml['xl/worksheets/sheet1.xml'],'AD11').includes('<v>1080</v>'));
});
test('Retirar manuales limpia sólo sus datos, horas y acarreo; un reporte nuevo comienza vacío',()=>{
  let b=conManuales();const p=b.personal[0],e=b.equipos[0].id;
  b={...b,codigoActividad:'533'};b=agregarAcarreo(b,e);b=retirarEquipo(b,e);b=retirarPersonal(b,p);
  assert.deepEqual(b.personalManual,[]);assert.deepEqual(b.equiposManuales,[]);assert.equal(b.horasPersonal[p],undefined);assert.equal(b.horasEquipos[e],undefined);assert.equal(b.acarreos[e],undefined);
  assert.deepEqual(nuevoEncabezado().personalManual,[]);assert.deepEqual(nuevoEncabezado().equiposManuales,[]);
});
test('El borrador rechaza manuales incompletos o duplicados y migra la versión anterior',()=>{
  const b=conManuales();assert.equal(leerBorrador(JSON.stringify(b)).personalManual.length,1);
  for(const cambios of [{personalManual:[]},{personalManual:[...b.personalManual,...b.personalManual]},{equiposManuales:[{...b.equiposManuales[0],numeroEquipo:''}]}])assert.throws(()=>leerBorrador(JSON.stringify({...b,...cambios})));
  const viejo={...ejemplo(),version:9};delete viejo.personalManual;delete viejo.equiposManuales;
  const r=leerBorrador(JSON.stringify(viejo));assert.equal(r.version,11);assert.deepEqual(r.personalManual,[]);assert.deepEqual(r.equiposManuales,[]);
  assert.ok(erroresPersonalManual({...persona,cedula:'12'}).cedula);assert.ok(erroresEquipoManual({...equipo,numeroEquipo:''}).numeroEquipo);
});
test('Fuente y material usan tamaño 14 sin negrita en los 27 espacios de acarreo de Excel',()=>{
  let b={...conManuales(),codigoActividad:'533'};const id=b.equipos[0].id;
  b=agregarAcarreo(b,id);b=actualizarAcarreo(b,id,{capacidadTexto:'12',longitudTexto:'90',fuente:'TAJO PRUEBA',material:'LASTRE'});
  const xml=archivos(generarExcel(plantilla,b,catalogos)),style=xml['xl/styles.xml'];
  const fonts=style.match(/<fonts\b[^>]*>([\s\S]*?)<\/fonts>/)[1].match(/<font\b[^>]*>[\s\S]*?<\/font>/g);
  const xf=style.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)[1].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
  for(const inicio of [4,22,35])for(let f=inicio;f<inicio+9;f++)for(const c of ['D','E']){
    const formato=xf[Number(celda(xml['xl/worksheets/sheet2.xml'],c+f).match(/\bs="(\d+)"/)[1])];
    const font=fonts[Number(formato.match(/\bfontId="(\d+)"/)[1])];assert.ok(font.includes('<sz val="14"/>'));assert.ok(!/<b\b/.test(font));assert.ok(formato.includes('shrinkToFit="0"'));
  }
});
test('El ajuste de texto a 14 sin negrita respeta palabras, letras anchas y los dos renglones',()=>{
  assert.deepEqual(lineasTextoAcarreo('TAJO PRUEBA','fuente'),['TAJO PRUEBA']);
  assert.deepEqual(lineasTextoAcarreo('LASTRE LAVADO','material'),['LASTRE','LAVADO']);
  const r={capacidadTexto:'12',longitudTexto:'90',fuente:'W'.repeat(16),material:'LASTRE',participante:'mopt',viajes:Array(12).fill(false)};
  assert.match(erroresAcarreo(r).fuente,/dos líneas/);assert.ok(lineasTextoAcarreo('W'.repeat(16),'fuente').length>2);
});
