import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,leerBorrador,generarExcel,valoresCeldas,errores,agregarPersonal,retirarPersonal,agregarEquipo,actualizarHorasPersonal,erroresHoras,nuevasHoras,totalHoras,unidadProduccion,produccionDelReporte} from '../core.mjs';
import {metrosEstacionamiento,estacionamientoVisible,erroresEstacionamientos,senasInicioDelReporte,avanceDelReporte} from '../estacionamientos.mjs';
import {esAcarreo,agregarAcarreo,actualizarAcarreo,filasAcarreos} from '../acarreos-reglas.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const catalogos=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const ejemplo=()=>({...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:'280',numeroReporteTexto:'1 / 1'});
function unzip(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};let p=0;
  while(v.getUint32(p,true)===0x04034b50){const tam=v.getUint32(p+18,true),n=v.getUint16(p+26,true),e=v.getUint16(p+28,true),s=p+30+n+e;out[new TextDecoder().decode(bytes.slice(p+30,p+30+n))]=new TextDecoder().decode(bytes.slice(s,s+tam));p=s+tam;}return out;
}
const celda=(xml,ref)=>xml.match(new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*?(?:\\s*/>|>[\\s\\S]*?</c>)'))[0];
test('Los kilómetros se expresan con tres dígitos de metros, sin redondear ni confundir 9,87 con 9 + 087',()=>{
  for(const [entrada,metros,visible] of [['4,5',4500,'4 + 500'],['9,87',9870,'9 + 870'],['1.001',1001,'1 + 001'],['3',3000,'3 + 000'],['0',0,'0 + 000'],['0004,050',4050,'4 + 050']]){
    assert.equal(metrosEstacionamiento(entrada),metros);assert.equal(estacionamientoVisible(entrada),visible);
  }
  for(const entrada of ['','-1','1e3','4,','4,0001','1 + 100','1.000,1','Infinity','9999999999999999999'])assert.equal(metrosEstacionamiento(entrada),null);
});
test('El ejemplo solicitado calcula exactamente 5,37 km y conserva el avance mínimo de un metro',()=>{
  const b={...ejemplo(),estacionamientoInicioTexto:'4,5',estacionamientoFinalTexto:'9,87'};
  assert.equal(senasInicioDelReporte(b),'Estacionamiento 4 + 500 al 9 + 870');assert.equal(avanceDelReporte(b),5.37);
  assert.equal(valoresCeldas(b,catalogos).AA16,5.37);
  assert.equal(avanceDelReporte({...b,estacionamientoInicioTexto:'1.001',estacionamientoFinalTexto:'1.002'}),.001);
  assert.equal(avanceDelReporte({...b,estacionamientoInicioTexto:'1',estacionamientoFinalTexto:'1'}),0);
});
test('Los dos estacionamientos son opcionales juntos y no se aceptan estaciones parciales o finales anteriores',()=>{
  assert.deepEqual(erroresEstacionamientos(ejemplo()),{});assert.equal(avanceDelReporte(ejemplo()),null);
  assert.equal(senasInicioDelReporte(ejemplo()),'Estacionamiento __________ al __________');
  for(const caso of [{estacionamientoInicioTexto:'4'},{estacionamientoFinalTexto:'9'},{estacionamientoInicioTexto:'9',estacionamientoFinalTexto:'4'},{estacionamientoInicioTexto:'4,0001',estacionamientoFinalTexto:'9'}]){
    const b={...ejemplo(),...caso};assert.ok(Object.keys(errores(b,catalogos)).length);assert.throws(()=>generarExcel(plantilla,b,catalogos));
  }
});
test('533 y 534 ignoran las estaciones y los campos manuales anteriores en el encabezado y en Excel',()=>{
  for(const codigoActividad of ['533','534']){
    const b={...ejemplo(),codigoActividad,estacionamientoInicioTexto:'9,',estacionamientoFinalTexto:'4',senasInicio:'Texto anterior',longitudTexto:'99,9'};
    assert.equal(senasInicioDelReporte(b),'');assert.equal(avanceDelReporte(b),null);assert.deepEqual(erroresEstacionamientos(b),{});
    const v=valoresCeldas(b,catalogos);assert.equal(v.D14,'');assert.equal(v.AA16,null);
    const xml=unzip(generarExcel(plantilla,b,catalogos))['xl/worksheets/sheet1.xml'];
    for(const ref of ['D14','AA16'])assert.ok(!/<f>|<v>[^<]+|<t>[^<]+/.test(celda(xml,ref)));
  }
});
test('Excel enlaza la fórmula de avance al texto de señas y conserva los decimales con formato General',()=>{
  const b={...ejemplo(),estacionamientoInicioTexto:'4,5',estacionamientoFinalTexto:'9,87'};
  const h=unzip(generarExcel(plantilla,b,catalogos)),f=h['xl/worksheets/sheet1.xml'],avance=celda(f,'AA16');
  assert.ok(celda(f,'D14').includes('Estacionamiento 4 + 500 al 9 + 870'));assert.ok(avance.includes('<f>'));assert.ok(avance.includes('D14'));assert.ok(avance.includes('<v>5.37</v>'));
  const xfs=h['xl/styles.xml'].match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)[1].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
  assert.ok(xfs[Number(avance.match(/\bs="(\d+)"/)[1])].includes('numFmtId="0"'));
});
test('PAG acepta SI o NO, requiere respuesta cuando hay extras y nunca participa en la suma',()=>{
  for(const pagoExtras of ['SI','NO']){
    const h={...nuevasHoras(),ordinarias:'8',extras:'2,125',pagoExtras};assert.deepEqual(erroresHoras(h),{});assert.equal(totalHoras(h),10.125);
  }
  for(const pagoExtras of ['','000','999','S','Sí'])assert.ok(erroresHoras({...nuevasHoras(),extras:'1',pagoExtras}).pagoExtras);
  assert.deepEqual(erroresHoras(nuevasHoras()),{});
});
test('Los códigos de institución de un borrador anterior se conservan como referencia y no se convierten en SI',()=>{
  let b=agregarPersonal(ejemplo(),datos.personal[0].id,catalogos),id=b.personal[0];
  b=actualizarHorasPersonal(b,id,{extras:'2',pagoExtras:'000'});b.version=10;
  const r=leerBorrador(JSON.stringify(b));assert.equal(r.version,11);assert.equal(r.horasPersonal[id].extras,'2');assert.equal(r.horasPersonal[id].pagoExtras,'');assert.equal(r.pagosAnteriores[id],'000');assert.ok(errores(r,catalogos).personal);
  assert.equal(retirarPersonal(r,id).pagosAnteriores[id],undefined);
  const corregido=actualizarHorasPersonal(r,id,{pagoExtras:'NO'});assert.equal(corregido.pagosAnteriores[id],undefined);assert.deepEqual(errores(corregido,catalogos),{});
  const vuelta=leerBorrador(JSON.stringify(corregido));assert.equal(vuelta.horasPersonal[id].pagoExtras,'NO');
});
test('Se recuperan estaciones, campos anteriores y números incompletos sin inferir estaciones desde una longitud sola',()=>{
  const b={...ejemplo(),version:10,senasInicio:'Desde el cruce',longitudTexto:'9'};
  const r=leerBorrador(JSON.stringify(b));assert.equal(r.senasInicio,b.senasInicio);assert.equal(r.longitudTexto,'9');assert.equal(r.estacionamientoInicioTexto,'');assert.equal(avanceDelReporte(r),null);
  const conocidos=leerBorrador(JSON.stringify({...b,senasInicio:'Estacionamiento 4 + 500 al 9 + 870'}));assert.equal(avanceDelReporte(conocidos),5.37);
  const incompleto=leerBorrador(JSON.stringify({...ejemplo(),estacionamientoInicioTexto:'4,'}));assert.equal(incompleto.estacionamientoInicioTexto,'4,');
});
test('534 utiliza el catálogo existente, abre acarreo y coloca inicialmente cada equipo contratado en alquilado',()=>{
  assert.ok(catalogos.actividades.has('534'));assert.ok(esAcarreo({codigoActividad:'534'}));
  let b=agregarPersonal({...ejemplo(),codigoActividad:'534'},datos.personal[0].id,catalogos);
  const equipo=datos.equipos.find(e=>e.codigoEquipo==='232'&&e.numeroEquipo);b=agregarEquipo(b,equipo.id,catalogos);b=agregarAcarreo(b,equipo.id);
  b=actualizarAcarreo(b,equipo.id,{capacidadTexto:'12,00',longitudTexto:'90',viajes:[true,...Array(11).fill(false)]});
  assert.equal(filasAcarreos(b)[0].fila,22);assert.equal(produccionDelReporte(b),1080);assert.equal(unidadProduccion(b,catalogos),'M³/KM');assert.deepEqual(errores(b,catalogos),{});
  let h=unzip(generarExcel(plantilla,b,catalogos));assert.ok(celda(h['xl/worksheets/sheet2.xml'],'S22').includes('<v>1080</v>'));assert.ok(celda(h['xl/worksheets/sheet1.xml'],'AD11').includes('E13=534'));
  b=actualizarAcarreo(b,equipo.id,{alquilado:false});assert.ok(errores(b,catalogos).acarreos);
  b=actualizarAcarreo(b,equipo.id,{participante:'municipalidad',provincia:'4',canton:'01'});assert.equal(filasAcarreos(b)[0].fila,35);assert.deepEqual(errores(b,catalogos),{});
  h=unzip(generarExcel(plantilla,b,catalogos));assert.ok(celda(h['xl/worksheets/sheet2.xml'],'A35').includes('401'));
});
test('La lista editable de PAG en Excel admite SI y NO en las once filas y precede a la impresión',()=>{
  let b=agregarPersonal(ejemplo(),datos.personal[0].id,catalogos);b=actualizarHorasPersonal(b,b.personal[0],{extras:'1',pagoExtras:'SI'});
  const f=unzip(generarExcel(plantilla,b,catalogos))['xl/worksheets/sheet1.xml'];assert.ok(celda(f,'T22').includes('>Si</t>'));
  assert.ok(f.includes('sqref="T22:T32"'));assert.ok(f.includes('&quot;Si,No&quot;'));assert.ok(f.indexOf('<dataValidations')<f.indexOf('<printOptions'));
});
