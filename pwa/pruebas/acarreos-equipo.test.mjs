import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,leerBorrador,errores,valoresCeldas,generarExcel,agregarEquipo,retirarEquipo,
  horasDeEquipo,nuevasHorasEquipo,actualizarHorasEquipo,totalHorasEquipo,erroresHorasEquipo,
  errorNumeroReporte,numeroReporteVisible,produccionDelReporte,partEquipo,FILAS_EQUIPOS} from '../core.mjs';
import {esAcarreo,nuevoAcarreo,agregarAcarreo,actualizarAcarreo,retirarAcarreo,codigoParticipante,
  numeroViajes,subtotalAcarreo,totalAcarreos,erroresAcarreos,enteroAcarreo,filasAcarreos,capacidadVisible} from '../acarreos-reglas.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const catalogos=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const ejemplo=()=>({...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:'533',numeroReporteTexto:'1 / 1',personal:datos.personal.slice(0,3).map(f=>f.id)});
const equipo=n=>datos.equipos.find(f=>f.codigoEquipo==='232'&&f.numeroEquipo===n);
function ejemploCompleto() {
  let b=ejemplo();
  for(const numero of ['1023','1017','997']) {
    const id=equipo(numero).id;b=agregarEquipo(b,id,catalogos);b=agregarAcarreo(b,id);
    b=actualizarAcarreo(b,id,{capacidadTexto:'12,00',longitudTexto:'90',fuente:'Tajo de prueba',material:'Lastre',viajes:[true,...Array(11).fill(false)]});
  }
  return b;
}
function hojas(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};let p=0;
  while(view.getUint32(p,true)===0x04034b50) {
    const tam=view.getUint32(p+18,true),nom=view.getUint16(p+26,true),extra=view.getUint16(p+28,true),inicio=p+30+nom+extra;
    out[new TextDecoder().decode(bytes.slice(p+30,p+30+nom))]=new TextDecoder().decode(bytes.slice(inicio,inicio+tam));p=inicio+tam;
  }
  return out;
}
function celda(xml,ref) {
  return xml.match(new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*?(?:\\s*/>|>[\\s\\S]*?</c>)'))[0];
}
test('El número de reporte admite enteros / enteros, conserva ceros y se exporta en Número',()=>{
  for(const t of ['1 / 2', '001/002', '0 / 0', '120/40'])assert.equal(errorNumeroReporte(t),'');
  for(const t of ['',' ','1','1,5/2','-1/2','1/2/3','x/x','1e2/3'])assert.ok(errorNumeroReporte(t));
  assert.equal(numeroReporteVisible(' 001/ 002 '),'001 / 002');
  const b={...ejemplo(),numeroReporteTexto:'3/4'},v=valoresCeldas(b,catalogos);assert.equal(v.AD3,'3 / 4');assert.equal(v.AD8,'');
  const frente=hojas(generarExcel(plantilla,b,catalogos))['xl/worksheets/sheet1.xml'];
  assert.ok(celda(frente,'AD3').includes('3 / 4'));assert.ok(!celda(frente,'AD8').includes('<v>'));
});
test('Las horas del equipo son opcionales, suman decimales y distinguen vacío de cero',()=>{
  assert.equal(totalHorasEquipo(nuevasHorasEquipo()),null);
  assert.equal(totalHorasEquipo({trabajadas:'0',traslado:''}),0);
  assert.equal(totalHorasEquipo({trabajadas:'0,1',traslado:'0.2'}),.3);
  assert.equal(totalHorasEquipo({trabajadas:'7,875',traslado:'0,125'}),8);
  assert.deepEqual(erroresHorasEquipo({trabajadas:'8',traslado:'1,5'}),{});
  for(const t of ['-1','1e3','7,','1.000,5'])assert.ok(erroresHorasEquipo({trabajadas:t,traslado:''}).trabajadas);
});
test('Retirar un equipo conserva las horas de los demás y elimina sólo su propio acarreo',()=>{
  let b=ejemploCompleto(),a=b.equipos[0].id,c=b.equipos[1].id;
  b=actualizarHorasEquipo(b,a,{trabajadas:'8'});b=actualizarHorasEquipo(b,c,{trabajadas:'7,5',traslado:'0,5'});
  b=retirarEquipo(b,a);assert.equal(b.horasEquipos[a],undefined);assert.equal(b.acarreos[a],undefined);
  const v=valoresCeldas(b,catalogos);assert.equal(v.AE22,7.5);assert.equal(v.AG22,.5);assert.equal(v.AH22,8);assert.equal(v.AC22,'1017');
  b=agregarEquipo(b,a,catalogos);assert.deepEqual(horasDeEquipo(b,a),nuevasHorasEquipo());assert.equal(b.acarreos[a],undefined);
  assert.throws(()=>actualizarHorasEquipo(b,'ausente',{trabajadas:'8'}));
});
test('Tres vagonetas con 12 m³, 90 km y un viaje producen 3240,00 M³/KM',()=>{
  const b=ejemploCompleto();assert.deepEqual(errores(b,catalogos),{});
  for(const r of Object.values(b.acarreos)){assert.equal(numeroViajes(r),1);assert.equal(subtotalAcarreo(r),1080);}
  assert.equal(totalAcarreos(b),3240);assert.equal(produccionDelReporte(b),3240);
  assert.equal(valoresCeldas(b,catalogos).AD11,3240);assert.equal(valoresCeldas(b,catalogos).AF11,'M³/KM');
  assert.equal(catalogos.actividades.get('533').unidad,'MK');
});
test('Se cuentan las casillas marcadas y se redondean subtotales como en Excel',()=>{
  const r={...nuevoAcarreo(),capacidadTexto:'12',longitudTexto:'90',viajes:Array(12).fill(false)};
  r.viajes[11]=true;assert.equal(numeroViajes(r),1);assert.equal(subtotalAcarreo(r),1080);
  r.viajes[0]=true;assert.equal(subtotalAcarreo(r),2160);r.viajes.fill(false);assert.equal(subtotalAcarreo(r),0);
  assert.equal(subtotalAcarreo({...r,capacidadTexto:'0,005',longitudTexto:'1',viajes:[true,...Array(11).fill(false)]}),.01);
  assert.equal(subtotalAcarreo({...r,capacidadTexto:'0,004',longitudTexto:'1',viajes:[true,...Array(11).fill(false)]}),0);
  for(const t of ['90,5','90.0','-1','1e2',''])assert.equal(enteroAcarreo(t),null);
  assert.equal(enteroAcarreo('0'),0);
  assert.equal(capacidadVisible('0012,500'),'12,50');assert.equal(capacidadVisible('0.125'),'0,125');assert.equal(capacidadVisible('12'),'12,00');
});
test('El reverso acepta participantes válidos, mantiene COD igual a PART y respeta los bloques',()=>{
  let b=ejemploCompleto(),[a,c,d]=b.equipos.map(f=>f.id);
  b=actualizarAcarreo(b,c,{participante:'municipalidad',provincia:'4',canton:'01'});
  b=actualizarAcarreo(b,d,{participante:'800',codigoParticipante:'801',alquilado:true});
  assert.equal(partEquipo(b,a),'000');assert.equal(partEquipo(b,c),'401');assert.equal(partEquipo(b,d),'801');
  assert.deepEqual(filasAcarreos(b).map(f=>[f.grupo,f.fila]),[['mopt',4],['otros',35],['alquilado',22]]);
  const r={...nuevoAcarreo(),participante:'municipalidad',provincia:'7',canton:'20'};assert.equal(codigoParticipante(r),'720');
  assert.equal(codigoParticipante({...r,provincia:'8'}),'');assert.equal(codigoParticipante({...r,canton:'00'}),'');
  assert.equal(codigoParticipante({...r,participante:'900',codigoParticipante:'999'}),'999');
  assert.equal(codigoParticipante({...r,participante:'800',codigoParticipante:'999'}),'');
  assert.equal(valoresCeldas(b,catalogos)['Z'+FILAS_EQUIPOS[1]],'401');
});
test('Los datos incompletos y el décimo equipo de un mismo bloque impiden una exportación parcial',()=>{
  let b=ejemploCompleto(),id=b.equipos[0].id;b=actualizarAcarreo(b,id,{longitudTexto:'90,5'});
  assert.equal(totalAcarreos(b),null);assert.ok(errores(b,catalogos).acarreos);assert.throws(()=>generarExcel(plantilla,b,catalogos));
  const diez={...ejemplo(),equipos:Array.from({length:10},(_,i)=>({id:'e'+i,part:'000'})),acarreos:{}};
  for(const f of diez.equipos)diez.acarreos[f.id]={...nuevoAcarreo(),capacidadTexto:'12',longitudTexto:'90'};
  assert.match(erroresAcarreos(diez).e9.grupo,/nueve/);
});
test('El acarreo de la undécima máquina enlaza sus identificadores con la última fila de datos del frente',()=>{
  let b={...ejemplo(),personal:datos.personal.slice(0,11).map(f=>f.id)};const equipos=datos.equipos.filter(f=>f.codigoEquipo==='232').slice(0,11);
  for(const f of equipos)b=agregarEquipo(b,f.id,catalogos);
  const id=equipos[10].id;b=agregarAcarreo(b,id);
  b=actualizarAcarreo(b,id,{capacidadTexto:'12,00',longitudTexto:'90',viajes:[true,...Array(11).fill(false)]});
  assert.deepEqual(errores(b,catalogos),{});assert.equal(produccionDelReporte(b),1080);
  const archivo=hojas(generarExcel(plantilla,b,catalogos)),frente=archivo['xl/worksheets/sheet1.xml'],reverso=archivo['xl/worksheets/sheet2.xml'];
  assert.ok(celda(reverso,'B4').includes('AA32'));assert.ok(celda(reverso,'B4').includes('AC32'));
  assert.ok(celda(reverso,'B4').includes('232-'+equipos[10].numeroEquipo));
  assert.ok(frente.includes('ref="Z33:AH33"'));assert.ok(celda(frente,'AD11').includes('<v>1080</v>'));
});
test('Sólo 533 exporta acarreos y las demás actividades conservan producción manual y reverso vacío',()=>{
  const b={...ejemploCompleto(),codigoActividad:'280',produccionTexto:'7,25'};
  assert.equal(esAcarreo(b),false);assert.equal(totalAcarreos(b),null);assert.equal(produccionDelReporte(b),7.25);assert.deepEqual(errores(b,catalogos),{});
  const h=hojas(generarExcel(plantilla,b,catalogos));assert.ok(!h['xl/worksheets/sheet2.xml'].includes('<f>'));
  assert.equal(partEquipo(b,b.equipos[0].id),'000');assert.equal(valoresCeldas(b,catalogos).AD11,7.25);
  assert.equal(totalAcarreos({...b,codigoActividad:'533'}),3240);
  assert.throws(()=>agregarAcarreo(b,b.equipos[0].id));
});
test('La versión 7 migra sin inventar datos y la 9 guarda número, horas y acarreos aún en edición',()=>{
  let b=ejemploCompleto(),id=b.equipos[0].id;b.numeroReporteTexto='1 /';b=actualizarHorasEquipo(b,id,{trabajadas:'7,'});
  b=actualizarAcarreo(b,id,{capacidadTexto:'12,'});
  const restaurado=leerBorrador(JSON.stringify(b));assert.equal(restaurado.numeroReporteTexto,'1 /');assert.equal(horasDeEquipo(restaurado,id).trabajadas,'7,');assert.equal(restaurado.acarreos[id].capacidadTexto,'12,');
  const viejo={...b,version:7};delete viejo.numeroReporteTexto;delete viejo.horasEquipos;delete viejo.acarreos;
  const migrado=leerBorrador(JSON.stringify(viejo));assert.equal(migrado.version,11);assert.equal(migrado.numeroReporteTexto,'');assert.deepEqual(migrado.acarreos,{});assert.deepEqual(horasDeEquipo(migrado,id),nuevasHorasEquipo());
  assert.throws(()=>leerBorrador(JSON.stringify({...b,acarreos:{[id]:{...b.acarreos[id],viajes:[true]}}})));
  assert.equal(retirarAcarreo(b,id).equipos.length,3);
});
test('El dato de Boleta de la versión 8 pasa al número de reporte sin perder otros campos',()=>{
  const antiguo={...ejemploCompleto(),version:8,boletaTexto:'001 / 002'};delete antiguo.numeroReporteTexto;
  const b=leerBorrador(JSON.stringify(antiguo));
  assert.equal(b.version,11);assert.equal(b.numeroReporteTexto,'001 / 002');assert.equal(b.boletaTexto,undefined);
  assert.deepEqual(b.equipos,antiguo.equipos);assert.deepEqual(b.acarreos,antiguo.acarreos);assert.deepEqual(b.horasEquipos,antiguo.horasEquipos);
  const v=valoresCeldas(b,catalogos);assert.equal(v.AD3,'001 / 002');assert.equal(v.AD8,'');assert.equal(v.AD11,3240);
  const incompleto=leerBorrador(JSON.stringify({...antiguo,boletaTexto:'1 /'}));
  assert.equal(incompleto.numeroReporteTexto,'1 /');assert.ok(errores(incompleto,catalogos).numero);
  assert.throws(()=>leerBorrador(JSON.stringify({...antiguo,boletaTexto:1})));
});
test('Excel enlaza el frente con el reverso y calcula horas, viajes y producción con fórmulas editables',()=>{
  let b=ejemploCompleto();b=actualizarHorasEquipo(b,b.equipos[0].id,{trabajadas:'7,5',traslado:'0,5'});
  const h=hojas(generarExcel(plantilla,b,catalogos)),frente=h['xl/worksheets/sheet1.xml'],reverso=h['xl/worksheets/sheet2.xml'];
  assert.ok(celda(frente,'AH22').includes('SUM(AE22,AG22)'));assert.ok(celda(frente,'AH22').includes('<v>8</v>'));
  assert.ok(celda(frente,'AD11').includes('AtrásRDA'));assert.ok(celda(frente,'AD11').includes('<v>3240</v>'));
  assert.ok(celda(reverso,'A4').includes('t="str"'));assert.ok(celda(reverso,'A4').includes('<v>000</v>'));
  assert.ok(celda(reverso,'B4').includes('<v>232-1023</v>'));assert.ok(celda(reverso,'B4').includes('AC22'));
  assert.ok(celda(reverso,'S4').includes('COUNTIFS(G4:R4,&quot;X&quot;)'));assert.ok(celda(reverso,'S4').includes('<v>1080</v>'));
  assert.ok(celda(reverso,'S43').includes('<f>'));assert.ok(celda(reverso,'S43').includes('<v/>'));
  assert.ok(reverso.includes('<dataValidations count="3">'));
  assert.ok(reverso.indexOf('<dataValidations')<reverso.indexOf('<printOptions'));
  const styles=h['xl/styles.xml'];assert.ok(styles.includes('0.00########'));assert.ok(styles.includes('wrapText="1"'));
});
test('Cada cara del Excel ajusta la impresión a una página y el reverso evita un bloque duplicado',()=>{
  for(const b of [ejemploCompleto(),{...ejemplo(),codigoActividad:'280'}]) {
    const h=hojas(generarExcel(plantilla,b,catalogos));
    for(const nombre of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml']) {
      assert.match(h[nombre],/<pageSetUpPr\b[^>]*fitToPage="1"/);
      const setup=h[nombre].match(/<pageSetup\b[^>]*\/>/)[0];
      assert.match(setup,/fitToHeight="1"/);assert.match(setup,/fitToWidth="1"/);
    }
    for(let fila=13;fila<=18;fila++)assert.match(h['xl/worksheets/sheet2.xml'],new RegExp('<row\\b[^>]*r="'+fila+'"[^>]*hidden="1"'));
    for(const fila of [4,12,22,30,35,43,45])assert.ok(!new RegExp('<row\\b[^>]*r="'+fila+'"[^>]*hidden="1"').test(h['xl/worksheets/sheet2.xml']));
  }
});
