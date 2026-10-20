import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {actualizarHorasEquipo} from '../core.mjs';
import {crearCatalogos,decimal,fechaHoy,fechaValida,fechaVisible,fechaDeTexto,diasCalendario,leerBorrador,nuevoEncabezado,errores,valoresCeldas,generarExcel,rellenarXml,crc32,generarPdf,buscarPersonal,buscarEquipos,buscarMateriales,agregarPersonal,agregarEquipo,agregarMaterial,errorCantidadMaterial,equipoCompleto,FILAS_PERSONAL,FILAS_EQUIPOS,FILAS_MATERIALES,FILAS_OBSERVACIONES,lineasObservaciones,errorObservaciones,nuevasHoras,horasDePersonal,actualizarHorasPersonal,retirarPersonal,totalHoras,erroresHoras,filaUltimaLinea} from '../core.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const catalogos=crearCatalogos(datos);
const plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const ejemplo=()=>({...nuevoEncabezado(),fecha:'2026-10-07',numeroReporteTexto:'1 / 1',codigoCamino:'4-0771-00',codigoActividad:'280'});
test('Los catálogos conservan todos los registros y rechazan códigos ambiguos',()=>{
  assert.equal(catalogos.caminos.size,109);assert.equal(catalogos.actividades.size,123);
  for(const [k,n]of Object.entries(datos.metadata.cantidades))assert.equal(datos[k].length,n);
  assert.throws(()=>crearCatalogos({...datos,actividades:[...datos.actividades,datos.actividades[0]]}));
});
test('El código del ejemplo completa DE/A y la actividad completa m³',()=>{
  const c=catalogos.caminos.get('4-0771-00');assert.equal(c.desde,'El Achiote(Cruce San Julián)');assert.equal(c.hasta,'La Aldea(Plaza)');assert.equal(c.longitudKm,14.81);
  const a=catalogos.actividades.get('280');assert.equal(a.descripcion,'Relleno de aproximación en puentes');assert.equal(a.unidad,'m³');
});
test('Camino, actividad, fecha y número de reporte son obligatorios',()=>{
  const b=ejemplo();assert.deepEqual(errores(b,catalogos),{});const v=valoresCeldas(b,catalogos);
  for(const k of ['AD8','AF13'])assert.equal(v[k],'');assert.equal(v.AD3,'1 / 1');assert.equal(v.C10,'V');assert.equal(v.AD11,null);assert.equal(v.AA16,null);assert.equal(v.AF11,'m³');
  assert.notEqual(v.AA16,catalogos.caminos.get(b.codigoCamino).longitudKm);
  assert.ok(errores({...b,codigoCamino:'DESCONOCIDO'},catalogos).camino);assert.ok(errores({...b,codigoActividad:'DESCONOCIDA'},catalogos).actividad);
});
test('Cero y coma decimal se conservan sin confundirlos con un campo vacío',()=>{
  assert.equal(decimal('0'),0);assert.equal(decimal('0,25'),.25);assert.equal(decimal('96.00'),96);
  for(const s of ['','-1','1e3','NaN','Infinity','1.000,50','1,2,3'])assert.equal(decimal(s),null);
  const v=valoresCeldas({...ejemplo(),produccionTexto:'0',estacionamientoInicioTexto:'0',estacionamientoFinalTexto:'0,25'},catalogos);assert.equal(v.AD11,0);assert.equal(v.AA16,.25);
});
test('La fecha usa el día local y presenta DD/MM/AAAA',()=>{
  assert.equal(fechaHoy(new Date(2026,9,7,0,1)),'2026-10-07');assert.equal(fechaVisible('2026-10-07'),'07/10/2026');
  assert.equal(fechaValida('2024-02-29'),true);for(const f of ['2026-02-29','2026-02-31','2026-13-01','07/10/2026','2026-2-01'])assert.equal(fechaValida(f),false);
});
test('Se migran los borradores anteriores sin exigir personal ni equipos',()=>{
  for(const version of [1,2,3]){const b=leerBorrador(JSON.stringify({...ejemplo(),version}));assert.equal(b.version,12);assert.equal(b.fechaTexto,'07/10/2026');assert.deepEqual(b.personal,[]);assert.deepEqual(b.equipos,[]);assert.deepEqual(b.materiales,[]);}
  assert.throws(()=>leerBorrador(JSON.stringify({...ejemplo(),version:3,fecha:'2026-02-31'})));
  assert.throws(()=>leerBorrador(JSON.stringify({...ejemplo(),produccionTexto:96})));
});
test('La fecha manual y el calendario aceptan años bisiestos y rechazan días imposibles',()=>{
  assert.equal(fechaDeTexto('7/10/2026'),'2026-10-07');assert.equal(fechaDeTexto('29/02/2024'),'2024-02-29');
  for(const texto of ['31/02/2026','29/02/2026','07/13/2026','07/10/26','2026-10-07',''])assert.equal(fechaDeTexto(texto),null);
  const febrero=diasCalendario(2024,2);assert.equal(febrero.filter(Boolean).length,29);assert.equal(febrero[3],'2024-02-01');assert.equal(febrero.at(-1),'2024-02-29');
  assert.equal(diasCalendario(2026,2).filter(Boolean).length,28);assert.deepEqual(diasCalendario(1800,1),[]);
});
test('El borrador conserva una fecha incompleta y no permite exportarla',()=>{
  const b={...ejemplo(),fecha:'',fechaTexto:'07/1'};const recuperado=leerBorrador(JSON.stringify(b));
  assert.equal(recuperado.fechaTexto,'07/1');assert.ok(errores(recuperado,catalogos).fecha);
});
test('Problema sigue opcional y las señas y avance provienen de las estaciones',()=>{
  for(const problema of ['','S','N']){const b={...ejemplo(),problema,estacionamientoInicioTexto:'0',estacionamientoFinalTexto:'0,75'};assert.deepEqual(errores(b,catalogos),{});const v=valoresCeldas(b,catalogos);assert.equal(v.AF13,problema);assert.equal(v.D14,'Estacionamiento 0 + 000 al 0 + 750');assert.equal(v.AA16,.75);}
  assert.ok(errores({...ejemplo(),problema:'X'},catalogos).problema);
});
test('La búsqueda de personal distingue registros con códigos repetidos y cédulas sin guiones',()=>{
  const f=datos.personal.find(f=>f.regional==='V Heredia'&&f.codigo==='06');assert.ok(f);
  assert.ok(buscarPersonal(catalogos,f.cedula.replaceAll('-','')).some(r=>r.id===f.id));
  assert.equal(buscarPersonal(catalogos,f.nombre)[0].nombre,f.nombre);
  const codigo=buscarPersonal(catalogos,'06');assert.ok(codigo.filter(r=>r.codigo==='06').length>1);assert.equal(codigo[0].regional,'V Heredia');
  assert.ok(buscarPersonal(catalogos,'06','V Heredia').every(r=>r.regional==='V Heredia'));
});
test('El personal MOPT usa PART 000 aunque el origen traiga otro valor y conserva sus datos',()=>{
  const f=datos.personal.find(f=>f.part==='001');assert.ok(f);const b=agregarPersonal(ejemplo(),f.id,catalogos),v=valoresCeldas(b,catalogos);
  assert.equal(v.B22,'000');assert.equal(v.B23,'');assert.equal(v.C22,f.codigo);assert.equal(v.E22,f.cedula);assert.equal(v.J22,f.nombre);assert.equal(v.Z22,'');assert.equal(v.AA22,'');assert.equal(v.AC22,'');assert.equal(b.equipos.length,0);
  assert.equal(catalogos.personal.get(f.id).part,'001');
  assert.throws(()=>agregarPersonal(b,f.id,catalogos),/ya existe/i);
});
test('Los equipos se identifican por sus componentes reales y conservan ceros iniciales',()=>{
  const f=datos.equipos.find(f=>equipoCompleto(f)&&/^0\d/.test(f.numeroEquipo));assert.ok(f);
  assert.ok(buscarEquipos(catalogos,f.codigoPorComponentes).some(r=>r.id===f.id));
  const b=agregarEquipo(agregarPersonal(ejemplo(),datos.personal[0].id,catalogos),f.id,catalogos),v=valoresCeldas(b,catalogos);
  assert.equal(v.AA22,f.codigoEquipo);assert.equal(v.AC22,f.numeroEquipo);assert.equal(v.Z22,'000');assert.equal(v.Z23,'');assert.equal(v.B22,'000');assert.equal(v.J22,datos.personal[0].nombre);assert.equal(b.personal.length,1);
  assert.throws(()=>agregarEquipo(b,f.id,catalogos),/ya existe/i);
  assert.throws(()=>agregarEquipo(ejemplo(),datos.equipos.find(f=>!equipoCompleto(f)).id,catalogos),/completos/);
});
test('El borrador anterior conserva las listas y cambia el PART manual de equipo a 000',()=>{
  let b=agregarPersonal(ejemplo(),datos.personal[0].id,catalogos);const f=datos.equipos.find(equipoCompleto);b=agregarEquipo(b,f.id,catalogos);b.equipos[0].part='001';
  const recuperado=leerBorrador(JSON.stringify(b));assert.deepEqual(recuperado.personal,b.personal);assert.deepEqual(recuperado.equipos,[{id:f.id,part:'000'}]);assert.equal(valoresCeldas(recuperado,catalogos).Z22,'000');
  assert.equal(valoresCeldas(b,catalogos).Z22,'000');assert.equal(valoresCeldas(recuperado,catalogos).B22,'000');
});
test('Las listas ocupan filas consecutivas y reservan la fila siguiente para el cierre',()=>{
  let b=ejemplo();for(const f of datos.personal.slice(0,11))b=agregarPersonal(b,f.id,catalogos);
  assert.throws(()=>agregarPersonal(b,datos.personal[11].id,catalogos),/11 trabajadores/);
  const equipos=[...new Map(datos.equipos.filter(equipoCompleto).map(f=>[f.codigoPorComponentes,f])).values()];
  for(const f of equipos.slice(0,11))b=agregarEquipo(b,f.id,catalogos);
  assert.throws(()=>agregarEquipo(b,equipos[11].id,catalogos),/11 equipos/);
  const v=valoresCeldas(b,catalogos);assert.equal(v.J32,datos.personal[10].nombre);assert.equal(v.AC32,equipos[10].numeroEquipo);
  assert.equal(v.J31,datos.personal[9].nombre);assert.equal(v.J30,datos.personal[8].nombre);
  assert.deepEqual(FILAS_PERSONAL,[22,23,24,25,26,27,28,29,30,31,32]);assert.deepEqual(FILAS_EQUIPOS,FILAS_PERSONAL);
});
test('Las fechas anteriores a marzo de 1900 mantienen el calendario real de Excel',()=>{
  for(const [fecha,serial]of [['1900-01-01',1],['1900-02-28',59],['1900-03-01',61]])assert.equal(valoresCeldas({...ejemplo(),fecha},catalogos).AD10,serial);
});
test('Se buscan los 78 materiales por código y descripción, con o sin tildes',()=>{
  assert.equal(catalogos.materiales.size,78);
  assert.equal(buscarMateriales(catalogos,'001')[0].descripcion,'Agua');
  assert.equal(buscarMateriales(catalogos,'agua')[0].codigo,'001');
  assert.ok(buscarMateriales(catalogos,'tuberia corrugada').some(f=>f.codigo==='965'));
  assert.deepEqual(buscarMateriales(catalogos,'inexistente'),[]);
  assert.throws(()=>crearCatalogos({...datos,materiales:[...datos.materiales,datos.materiales[0]]}),/repetido/);
});
test('Elegir material completa sus casillas, PART 000 y deja su cantidad vacía',()=>{
  let b=agregarPersonal(ejemplo(),'personal-323',catalogos);b=agregarEquipo(b,'equipo-142',catalogos);
  const anterior=valoresCeldas(b,catalogos);b=agregarMaterial(b,'001',catalogos);const v=valoresCeldas(b,catalogos);
  assert.equal(v.B39,'000');assert.equal(v.C39,'001');assert.equal(v.E39,'Agua');assert.equal(v.O39,'lt');assert.equal(v.P39,null);
  for(const col of ['B','C','E','O'])assert.equal(v[col+'40'],'');assert.equal(v.P40,null);
  for(const ref of ['B22','C22','E22','J22','Z22','AA22','AC22'])assert.equal(v[ref],anterior[ref]);
  assert.equal(v.E22,'1-1236-0741');assert.equal(b.materiales[0].cantidadTexto,'');
  assert.throws(()=>agregarMaterial(b,'001',catalogos),/ya está/);
  assert.throws(()=>agregarMaterial(b,'DESCONOCIDO',catalogos),/Selecciona/);
});
test('Las cantidades distinguen vacío, cero, enteros y decimales sin exigir dos decimales',()=>{
  for(const [texto,valor] of [['',null],['  ',null],['0',0],['12',12],['12,50',12.5],['0.125',.125],['2.000',2]]) {
    const b=agregarMaterial(ejemplo(),'540',catalogos);b.materiales[0].cantidadTexto=texto;
    assert.equal(errorCantidadMaterial(texto),'');assert.deepEqual(errores(b,catalogos),{});assert.equal(valoresCeldas(b,catalogos).P39,valor);
  }
  for(const texto of ['-1','NaN','1e3','1,2,3','7,','texto','1/8']) {
    const b=agregarMaterial(ejemplo(),'001',catalogos);b.materiales[0].cantidadTexto=texto;
    assert.ok(errores(b,catalogos).materiales);assert.throws(()=>valoresCeldas(b,catalogos));
  }
});
test('Los materiales caben en las ocho filas y conservan las unidades del catálogo',()=>{
  let b=ejemplo();for(const material of datos.materiales.slice(0,8))b=agregarMaterial(b,material.codigo,catalogos);
  assert.equal(b.materiales.length,8);assert.throws(()=>agregarMaterial(b,datos.materiales[8].codigo,catalogos),/8 materiales/);
  const v=valoresCeldas(b,catalogos);assert.equal(v.C46,datos.materiales[7].codigo);assert.equal(v.E46,datos.materiales[7].descripcion);
  assert.equal(v.B47,undefined);assert.deepEqual(FILAS_MATERIALES,[39,40,41,42,43,44,45,46]);
  for(const material of datos.materiales.filter(f=>['m4','m5','m6'].includes(f.unidad)))assert.equal(valoresCeldas(agregarMaterial(ejemplo(),material.codigo,catalogos),catalogos).O39,material.unidad);
  assert.ok(errores({...b,materiales:[...b.materiales,b.materiales[0]]},catalogos).materiales);
});
test('La versión 4 migra sin perder datos y el borrador recupera cantidades incompletas',()=>{
  let b=agregarPersonal(ejemplo(),'personal-323',catalogos);b=agregarEquipo(b,'equipo-142',catalogos);
  const anterior={...b,version:4};delete anterior.materiales;
  const recuperado=leerBorrador(JSON.stringify(anterior));assert.deepEqual(recuperado.personal,b.personal);assert.deepEqual(recuperado.equipos,b.equipos);assert.deepEqual(recuperado.materiales,[]);
  b=agregarMaterial(b,'001',catalogos);b.materiales[0].cantidadTexto='7,';
  assert.equal(leerBorrador(JSON.stringify(b)).materiales[0].cantidadTexto,'7,');
  assert.throws(()=>leerBorrador(JSON.stringify({...b,materiales:[{codigo:'001',cantidadTexto:7}]})),/inválido/);
  assert.throws(()=>leerBorrador(JSON.stringify({...b,materiales:null})),/inválido/);
});
test('Al rellenar una celda vacía no se borran las celdas vecinas',()=>{
  const xml='<worksheet><c r="A1" s="3" /><c r="B1" s="4"/><c r="C1"><v>77</v></c></worksheet>';
  const nuevo=rellenarXml(xml,{A1:'=texto & <referencia>',B1:0});
  assert.ok(nuevo.includes('t="inlineStr"'));assert.ok(nuevo.includes('=texto &amp; &lt;referencia&gt;'));assert.ok(nuevo.includes('<v>0</v>'));assert.ok(nuevo.includes('<c r="C1"><v>77</v></c>'));
  assert.throws(()=>rellenarXml(xml,{D1:1}));
});
test('Las observaciones respetan saltos de línea y continúan sin perder palabras ni Unicode',()=>{
  assert.deepEqual(lineasObservaciones(''),[]);
  assert.deepEqual(lineasObservaciones('  Primera línea\r\nSegunda línea\nTercera línea  '),['Primera línea','Segunda línea','Tercera línea']);
  const texto=Array(20).fill('Revisión').join(' '),lineas=lineasObservaciones(texto);
  assert.ok(lineas.length>1);assert.equal(lineas.join(' '),texto);
  assert.ok(lineas.every(l=>Array.from(l).length<=70));
  const largo='é'.repeat(71);assert.equal(lineasObservaciones(largo).join(''),largo);
  const unicode='😀'.repeat(71);assert.equal(lineasObservaciones(unicode).join(''),unicode);
  assert.deepEqual(FILAS_OBSERVACIONES,[38,39,40]);
});
test('Las observaciones son opcionales y un texto que no cabe no se exporta parcialmente',()=>{
  for(const texto of ['', '  ', 'Trabajos realizados sin incidencias.', 'Uno\nDos\nTres']) {
    assert.equal(errorObservaciones(texto),'');assert.deepEqual(errores({...ejemplo(),observaciones:texto},catalogos),{});
  }
  for(const texto of ['Uno\nDos\nTres\nCuatro','Observación '.repeat(40),'Texto\u0000no válido']) {
    const b={...ejemplo(),observaciones:texto};assert.ok(errores(b,catalogos).observaciones);
    assert.throws(()=>generarExcel(plantilla,b,catalogos));
  }
  const v=valoresCeldas(ejemplo(),catalogos);for(const fila of FILAS_OBSERVACIONES)assert.equal(v['U'+fila],'');
});
test('El borrador anterior conserva materiales y cédulas, y las observaciones se recuperan completas',()=>{
  let b=agregarPersonal(ejemplo(),'personal-323',catalogos);b=agregarEquipo(b,'equipo-142',catalogos);b=agregarMaterial(b,'001',catalogos);
  b.materiales[0].cantidadTexto='0,125';b.observaciones='Texto aún en edición\n';
  const anterior={...b,version:5};delete anterior.observaciones;
  const recuperado=leerBorrador(JSON.stringify(anterior));assert.equal(recuperado.version,12);
  assert.equal(recuperado.observaciones,'');assert.deepEqual(recuperado.personal,b.personal);assert.deepEqual(recuperado.equipos,b.equipos);assert.deepEqual(recuperado.materiales,b.materiales);
  assert.equal(valoresCeldas({...recuperado,numeroReporteTexto:'1 / 1'},catalogos).E22,'1-1236-0741');
  assert.equal(leerBorrador(JSON.stringify(b)).observaciones,b.observaciones);
  b.observaciones='Uno\nDos\nTres\nCuatro';assert.equal(leerBorrador(JSON.stringify(b)).observaciones,b.observaciones);
  assert.throws(()=>leerBorrador(JSON.stringify({...b,observaciones:7})),/inválido/);
});
function leerZipGuardado(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),archivos=new Map();let p=0;
  while(v.getUint32(p,true)===0x04034b50){const crc=v.getUint32(p+14,true),n=v.getUint32(p+18,true),a=v.getUint16(p+26,true),extra=v.getUint16(p+28,true);const nombre=new TextDecoder().decode(bytes.slice(p+30,p+30+a)),inicio=p+30+a+extra,contenido=bytes.slice(inicio,inicio+n);assert.equal(crc32(contenido),crc);archivos.set(nombre,contenido);p=inicio+n;}
  assert.equal(v.getUint32(p,true),0x02014b50);return archivos;
}
test('La novena persona y el cuarto equipo tienen sus columnas y horas en las filas restauradas',()=>{
  let b=ejemplo();for(const f of datos.personal.slice(0,10))b=agregarPersonal(b,f.id,catalogos);
  const equipos=[...new Map(datos.equipos.filter(equipoCompleto).map(f=>[f.codigoPorComponentes,f])).values()].slice(0,5);
  for(const f of equipos)b=agregarEquipo(b,f.id,catalogos);
  b=actualizarHorasPersonal(b,b.personal[8],{ordinarias:'6',traslado:'2'});
  const v=valoresCeldas(b,catalogos);assert.equal(v.J30,datos.personal[8].nombre);assert.equal(v.X30,8);assert.equal(v.AC25,equipos[3].numeroEquipo);
  const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos)),xml=new TextDecoder().decode(archivos.get('xl/worksheets/sheet1.xml'));
  for(const ref of ['C30:D30','E30:I30','J30:Q30','AA25:AB25','AC25:AD25','AE25:AF25'])assert.ok(xml.includes('ref="'+ref+'"'),ref);
  for(const ref of ['B30:X30','Z25:AH25'])assert.ok(!xml.includes('ref="'+ref+'"'),ref);
  assert.ok(xml.match(/<c\b[^>]*r="X30"[^>]*>[\s\S]*?<\/c>/)[0].includes('SUM(R30:S30,U30,V30)'));
  assert.ok(xml.includes('ref="B32:X32"'));assert.ok(xml.includes('ref="Z27:AH27"'));
});
test('Las cantidades de materiales se centran sin perder decimales, cero ni casillas vacías',()=>{
  let b=agregarMaterial(ejemplo(),'001',catalogos);b.materiales[0].cantidadTexto='0,125';
  const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos)),xml=new TextDecoder().decode(archivos.get('xl/worksheets/sheet1.xml'));
  const estilos=new TextDecoder().decode(archivos.get('xl/styles.xml'));
  const formatos=estilos.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)[1].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
  for(const fila of FILAS_MATERIALES) {
    const c=xml.match(new RegExp('<c\\b[^>]*r="P'+fila+'"[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)'))[0];
    const f=formatos[Number(c.match(/\bs="(\d+)"/)[1])];
    assert.ok(f.includes('horizontal="center"'));assert.ok(f.includes('vertical="center"'));assert.ok(f.includes('numFmtId="0"'));
  }
  assert.ok(xml.match(/<c\b[^>]*r="P39"[^>]*>[\s\S]*?<\/c>/)[0].includes('<v>0.125</v>'));
  b.materiales[0].cantidadTexto='0';assert.equal(valoresCeldas(b,catalogos).P39,0);
});
test('El Excel escribe observaciones literales en sus tres celdas y siempre conserva el reverso',()=>{
  const notas=['=Revisión & <puente>','Cédula y equipo verificados.','Sin incidencias.'];
  for(const codigoActividad of ['280','533']) {
    const b={...ejemplo(),codigoActividad,observaciones:notas.join('\n')};
    const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos));
    assert.ok(archivos.has('xl/worksheets/sheet2.xml'));
    const xml=new TextDecoder().decode(archivos.get('xl/worksheets/sheet1.xml'));
    for(const [i,fila] of FILAS_OBSERVACIONES.entries()) {
      const celda=xml.match(new RegExp('<c\\b[^>]*\\br="U'+fila+'"[^>]*>[\\s\\S]*?<\\/c>'))[0];
      assert.ok(celda.includes('t="inlineStr"'));assert.ok(!celda.includes('<f>'));
      assert.ok(celda.includes(notas[i].replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));
    }
    const original=new TextDecoder().decode(Uint8Array.from(atob(plantilla.find(f=>f.nombre==='xl/worksheets/sheet1.xml').base64),c=>c.charCodeAt(0)));
    for(const fila of FILAS_OBSERVACIONES) {
      const ref='U'+fila+':AG'+fila;
      assert.ok(xml.includes('ref="'+ref+'"'));assert.ok(original.includes('ref="'+ref+'"'));
    }
    const estilos=new TextDecoder().decode(archivos.get('xl/styles.xml'));
    assert.ok(estilos.includes('shrinkToFit="1"'));
    for(const ref of ['U41','U42','U44','B47']) {
      const celda=new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)');
      assert.equal(xml.match(celda)[0],original.match(celda)[0]);
    }
  }
});
test('Las dos hojas tienen una sola configuración de impresión en el orden de SpreadsheetML',()=>{
  let completo=agregarPersonal(ejemplo(),datos.personal.find(f=>f.regional==='V Heredia').id,catalogos);
  completo=agregarEquipo(completo,datos.equipos.find(f=>f.regional==='V Heredia'&&equipoCompleto(f)).id,catalogos);
  for(const b of [ejemplo(),completo]) {
    const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos));
    for(const nombre of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml']) {
      const xml=new TextDecoder().decode(archivos.get(nombre));
      let anterior=xml.indexOf('</sheetData>');
      for(const etiqueta of ['printOptions','pageMargins','pageSetup']) {
        assert.equal([...xml.matchAll(new RegExp('<'+etiqueta+'\\b','g'))].length,1,nombre+': '+etiqueta+' duplicado');
        const posicion=xml.indexOf('<'+etiqueta);
        assert.ok(posicion>anterior,nombre+': '+etiqueta+' fuera de orden');anterior=posicion;
      }
      const dibujo=xml.indexOf('<drawing');
      if(dibujo>=0)assert.ok(dibujo>anterior,nombre+': el dibujo debe seguir a pageSetup');
      const original=new TextDecoder().decode(Uint8Array.from(atob(plantilla.find(f=>f.nombre===nombre).base64),c=>c.charCodeAt(0)));
      const margenOriginal=[...original.matchAll(/<pageMargins\b[^>]*\/>/g)].at(-1)[0];
      const margenNuevo=xml.match(/<pageMargins\b[^>]*\/>/)[0];
      for(const lado of ['left','right','top','bottom']) {
        const antes=Number(margenOriginal.match(new RegExp('\\b'+lado+'="([^"]+)"'))[1]);
        const despues=Number(margenNuevo.match(new RegExp('\\b'+lado+'="([^"]+)"'))[1]);
        assert.equal(despues,Math.max(.25,antes),nombre+': margen de impresión seguro '+lado);
      }
    }
  }
});
test('El Excel conserva las hojas, imágenes y geometría fuera de los cierres solicitados',()=>{
  const b={...ejemplo(),estacionamientoInicioTexto:'1',estacionamientoFinalTexto:'1,25',produccionTexto:'96'};
  const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos));assert.equal(archivos.size,plantilla.length);
  for(const f of plantilla)if(!['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml','xl/styles.xml'].includes(f.nombre))assert.deepEqual(archivos.get(f.nombre),Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0)));
  const sinImpresion=xml=>xml.replace(/<(?:printOptions|pageMargins|pageSetup)\b[^>]*\/>/g,'')
    .replace(/<pageSetUpPr\b[^>]*\/>/g,'<pageSetUpPr fitToPage="0"/>')
    .replace(/<row\b([^>]*\br="1[3-8]"[^>]*?)>/g,(_,attrs)=>'<row'+attrs.replace(/\s+hidden="1"/g,'')+'>');
  assert.equal(sinImpresion(new TextDecoder().decode(archivos.get('xl/worksheets/sheet2.xml'))),
    sinImpresion(new TextDecoder().decode(Uint8Array.from(atob(plantilla.find(f=>f.nombre==='xl/worksheets/sheet2.xml').base64),c=>c.charCodeAt(0)))));
  const xml=new TextDecoder().decode(archivos.get('xl/worksheets/sheet1.xml'));
  const original=new TextDecoder().decode(Uint8Array.from(atob(plantilla.find(f=>f.nombre==='xl/worksheets/sheet1.xml').base64),c=>c.charCodeAt(0)));
  assert.equal(xml.match(/<cols\b[\s\S]*?<\/cols>/)[0],original.match(/<cols\b[\s\S]*?<\/cols>/)[0]);
  assert.deepEqual(xml.match(/<row\b[^>]*>/g),original.match(/<row\b[^>]*>/g));
  const estilos=new TextDecoder().decode(archivos.get('xl/styles.xml')),estilosOriginal=atob(plantilla.find(f=>f.nombre==='xl/styles.xml').base64);
  assert.ok(estilos.includes(estilosOriginal.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)[1]));
  assert.ok(xml.includes('4-0771-00'));assert.ok(xml.includes('m³'));assert.ok(xml.includes('Estacionamiento 1 + 000 al 1 + 250'));assert.ok(xml.includes('<v>0.25</v>'));assert.ok(xml.includes('<v>96</v>'));assert.equal((xml.match(/<f>/g)??[]).length,1);assert.match(xml,/<c\b[^>]*r="AA16"[^>]*><f>/);
});
test('Los nombres completos ajustan su ancho y se mantienen los estilos originales y las horas vacías',()=>{
  let b=agregarPersonal(ejemplo(),datos.personal.find(f=>f.regional==='V Heredia').id,catalogos);
  b=agregarEquipo(b,datos.equipos.find(f=>f.regional==='V Heredia'&&equipoCompleto(f)).id,catalogos);
  const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos)),xml=new TextDecoder().decode(archivos.get('xl/worksheets/sheet1.xml'));
  const estilos=new TextDecoder().decode(archivos.get('xl/styles.xml'));
  const original=atob(plantilla.find(f=>f.nombre==='xl/styles.xml').base64);
  assert.ok(estilos.includes('shrinkToFit="1"'));assert.ok(estilos.includes(original.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)[1]));
  for(const f of plantilla)if(!['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml','xl/styles.xml'].includes(f.nombre))assert.deepEqual(archivos.get(f.nombre),Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0)));
  assert.ok(xml.includes(catalogos.personal.get(b.personal[0]).nombre));
  for(const celda of ['R22','S22','T22','U22','V22','W22','X22','AE22','AG22','AH22'])assert.ok(!new RegExp(`<c\\b[^>]*r="${celda}"[^>]*>[\\s\\S]*?<v>`).test(xml.match(new RegExp(`<c\\b[^>]*r="${celda}"[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`))?.[0]??''));
});
test('El Excel conserva descripciones completas y cantidades numéricas en sus celdas originales',()=>{
  let b=agregarMaterial(ejemplo(),'965',catalogos);b.materiales[0].cantidadTexto='0,125';b=agregarMaterial(b,'001',catalogos);
  const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos));
  const xml=new TextDecoder().decode(archivos.get('xl/worksheets/sheet1.xml'));
  const estilos=new TextDecoder().decode(archivos.get('xl/styles.xml'));
  assert.ok(xml.includes(catalogos.materiales.get('965').descripcion));assert.ok(xml.match(/<c\b[^>]*\br="P39"[^>]*><v>0\.125<\/v><\/c>/));
  assert.ok(xml.match(/<c\b[^>]*\br="P40"[^>]*\/>/));
  const formatos=estilos.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)[1].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
  for(const ref of ['E39','E40','P39','P40']) {
    const celda=xml.match(new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*>'))[0];const id=Number(celda.match(/\bs="(\d+)"/)[1]);
    assert.ok(formatos[id].includes('shrinkToFit="1"'));
    if(ref.startsWith('P'))assert.ok(formatos[id].includes('numFmtId="0"'));
  }
  const horas=xml.match(/<c\b[^>]*\br="R22"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/)[0];assert.ok(!horas.includes('<v>'));
});
test('El PDF calcula sus referencias y conserva páginas de tamaño carta',()=>{
  const pdf=generarPdf([{bytes:new Uint8Array([255,216,255,217]),ancho:2448,alto:3168}]);
  const s=new TextDecoder().decode(pdf);assert.ok(s.startsWith('%PDF-1.4'));assert.ok(s.includes('/Count 1'));assert.ok(s.includes('/MediaBox [0 0 612 792]'));
  const inicio=Number(s.match(/startxref\n(\d+)/)[1]);assert.equal(new TextDecoder().decode(pdf.slice(inicio,inicio+4)),'xref');
});
test('La PWA incluye los archivos necesarios para instalación y uso sin conexión',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url)));
  assert.equal(manifest.display,'standalone');for(const n of ['192x192','512x512'])assert.ok(manifest.icons.some(i=>i.sizes===n));
  const eventos={},contexto={self:{addEventListener:(n,f)=>eventos[n]=f},caches:{},URL,Promise};
  const codigo=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');vm.runInNewContext(codigo+'\nself.archivos=ARCHIVOS;',contexto);
  for(const ruta of contexto.self.archivos)assert.ok(fs.existsSync(new URL('../'+(ruta==='./'?'index.html':ruta),import.meta.url)),ruta);
  assert.ok(eventos.install&&eventos.activate&&eventos.fetch);
});
test('Los recursos precargados se recuperan de la caché cuando falla Internet',async()=>{
  const eventos={},respuesta={ok:true,contenido:'plantilla'},cache={match:async()=>respuesta};let consultoRed=false;
  const contexto={URL,Promise,self:{location:{origin:'https://ejemplo.test'},registration:{scope:'https://ejemplo.test/pwa/'},addEventListener:(n,f)=>eventos[n]=f},caches:{open:async()=>cache},fetch:async()=>{consultoRed=true;throw new Error('Sin red');}};
  vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),contexto);
  let promesa;eventos.fetch({request:{url:'https://ejemplo.test/pwa/assets/frente.png',method:'GET',mode:'cors'},respondWith:p=>promesa=p});assert.equal(await promesa,respuesta);assert.equal(consultoRed,false);
});

test('El total de horas incluye las cuatro cantidades y excluye PAG y JUST.',()=>{
  assert.equal(totalHoras(nuevasHoras()),null);
  assert.equal(totalHoras({...nuevasHoras(),ordinarias:'0'}),0);
  assert.equal(totalHoras({...nuevasHoras(),ordinarias:'0,1',extras:'0,2',pagoExtras:'NO'}),.3);
  const h={...nuevasHoras(),ordinarias:'8',extras:'2,125',pagoExtras:'SI',traslado:'2',noTrabajadas:'1',justificacion:'6'};
  assert.equal(totalHoras(h),13.125);assert.deepEqual(erroresHoras(h),{});
  assert.equal(totalHoras({...h,ordinarias:'7,'}),null);
});
test('PAG usa SI o NO y se conservan los motivos y traslados',()=>{
  assert.ok(erroresHoras({...nuevasHoras(),extras:'1'}).pagoExtras);
  assert.ok(erroresHoras({...nuevasHoras(),extras:'1',pagoExtras:'00'}).pagoExtras);
  assert.deepEqual(erroresHoras({...nuevasHoras(),extras:'1',pagoExtras:'NO'}),{});
  assert.deepEqual(erroresHoras({...nuevasHoras(),noTrabajadas:'0,5'}),{});
  for(const justificacion of ['','1','2','3','4','5','6','7'])
    assert.deepEqual(erroresHoras({...nuevasHoras(),noTrabajadas:'0,5',justificacion}),{});
  for(const traslado of ['','0','0.25','0,25','0.5','0,5','0.75','0,75','1','2','2,25'])assert.deepEqual(erroresHoras({...nuevasHoras(),traslado}),{});
  for(const traslado of ['-0,25','0:30'])assert.ok(erroresHoras({...nuevasHoras(),traslado}).traslado);
  for(const campo of ['ordinarias','extras','traslado','noTrabajadas'])
    assert.ok(erroresHoras({...nuevasHoras(),[campo]:'-1'})[campo]);
});
test('Las horas siguen al trabajador al retirar otro registro y vuelven vacías al agregarlo',()=>{
  let b=agregarPersonal(ejemplo(),'personal-323',catalogos);b=agregarPersonal(b,'personal-324',catalogos);
  b=actualizarHorasPersonal(b,'personal-323',{ordinarias:'8'});
  b=actualizarHorasPersonal(b,'personal-324',{ordinarias:'7,875',extras:'0,125',pagoExtras:'SI'});
  b=retirarPersonal(b,'personal-323');
  assert.equal(b.horasPersonal['personal-323'],undefined);
  assert.equal(valoresCeldas(b,catalogos).R22,7.875);assert.equal(valoresCeldas(b,catalogos).X22,8);
  assert.equal(valoresCeldas(b,catalogos).E22,'1-1254-0290');
  b=agregarPersonal(b,'personal-323',catalogos);assert.deepEqual(horasDePersonal(b,'personal-323'),nuevasHoras());
  assert.throws(()=>actualizarHorasPersonal(b,'NO EXISTE',{ordinarias:'8'}));
});
test('La versión 6 migra sin horas inventadas y la 7 conserva horas incompletas',()=>{
  let b=agregarPersonal(ejemplo(),'personal-323',catalogos);b=agregarEquipo(b,'equipo-142',catalogos);
  b=agregarMaterial(b,'001',catalogos);b.observaciones='Observación anterior.';
  const viejo={...b,version:6};delete viejo.horasPersonal;
  const migrado=leerBorrador(JSON.stringify(viejo));
  assert.equal(migrado.version,12);assert.equal(migrado.observaciones,b.observaciones);
  assert.deepEqual(migrado.materiales,b.materiales);assert.deepEqual(migrado.equipos,b.equipos);
  assert.deepEqual(horasDePersonal(migrado,'personal-323'),nuevasHoras());
  b=actualizarHorasPersonal(b,'personal-323',{ordinarias:'7,'});
  assert.equal(horasDePersonal(leerBorrador(JSON.stringify(b)),'personal-323').ordinarias,'7,');
  assert.ok(errores(b,catalogos).personal);assert.throws(()=>generarExcel(plantilla,b,catalogos));
  assert.throws(()=>leerBorrador(JSON.stringify({...b,horasPersonal:[]})));
  assert.throws(()=>leerBorrador(JSON.stringify({...b,horasPersonal:{'personal-323':{...nuevasHoras(),ordinarias:7}}})));
  const once={...viejo,personal:datos.personal.slice(0,11).map(f=>f.id)};
  assert.equal(leerBorrador(JSON.stringify(once)).personal.length,11);
  assert.deepEqual(errores({...leerBorrador(JSON.stringify(once)),numeroReporteTexto:'1 / 1'},catalogos),{});
  const doce={...viejo,personal:datos.personal.slice(0,12).map(f=>f.id)};
  assert.equal(leerBorrador(JSON.stringify(doce)).personal.length,12);
  assert.match(errores(leerBorrador(JSON.stringify(doce)),catalogos).personal,/11 trabajadores/);
});
test('Los cierres ocupan la fila física siguiente y quedan centrados dentro de cada tabla',()=>{
  const equipos=[...new Map(datos.equipos.filter(equipoCompleto).map(f=>[f.codigoPorComponentes,f])).values()];
  for(const [personas,maquinas,filaPersonal,filaEquipo] of [[0,0,22,22],[1,1,23,23],[8,3,30,25],[10,10,32,32],[11,11,33,33],[11,10,33,32]]) {
    let b=ejemplo();for(const f of datos.personal.slice(0,personas))b=agregarPersonal(b,f.id,catalogos);
    for(const f of equipos.slice(0,maquinas))b=agregarEquipo(b,f.id,catalogos);
    assert.equal(filaUltimaLinea('personal',personas),filaPersonal);
    assert.equal(filaUltimaLinea('equipos',maquinas),filaEquipo);
    const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos)),xml=new TextDecoder().decode(archivos.get('xl/worksheets/sheet1.xml'));
    const estilos=new TextDecoder().decode(archivos.get('xl/styles.xml'));
    const formatos=estilos.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)[1].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
    for(const [inicio,fin,fila] of [['B','X',filaPersonal],['Z','AH',filaEquipo]]) {
      assert.ok(xml.includes('ref="'+inicio+fila+':'+fin+fila+'"'));
      const celda=xml.match(new RegExp('<c\\b[^>]*\\br="'+inicio+fila+'"[^>]*>[\\s\\S]*?<\\/c>'))[0];
      assert.ok(celda.includes('Última línea'));
      const formato=formatos[Number(celda.match(/\bs="(\d+)"/)[1])];
      assert.ok(formato.includes('horizontal="center"'));assert.ok(formato.includes('vertical="center"'));
    }
    assert.equal([...xml.matchAll(/Última línea/g)].length,2);
    for(const ref of ['B47:AG47','C34:D34','U38:AG38','U42:AG42','U44:AG44'])assert.ok(xml.includes('ref="'+ref+'"'));
  }
});
test('La undécima persona y máquina conservan sus datos y horas sin otra fila debajo del cierre final',()=>{
  let b=ejemplo();for(const f of datos.personal.slice(0,11))b=agregarPersonal(b,f.id,catalogos);
  const equipos=[...new Map(datos.equipos.filter(equipoCompleto).map(f=>[f.codigoPorComponentes,f])).values()].slice(0,11);
  for(const f of equipos)b=agregarEquipo(b,f.id,catalogos);
  b=actualizarHorasPersonal(b,b.personal[10],{ordinarias:'7,75',extras:'0,25',pagoExtras:'SI'});
  b=actualizarHorasEquipo(b,b.equipos[10].id,{trabajadas:'7,25',traslado:'0,75'});
  assert.deepEqual(errores(b,catalogos),{});
  const v=valoresCeldas(b,catalogos);assert.equal(v.J32,datos.personal[10].nombre);
  assert.equal(v.R32,7.75);assert.equal(v.S32,.25);assert.equal(v.X32,8);
  assert.equal(v.AC32,equipos[10].numeroEquipo);assert.equal(v.AE32,7.25);assert.equal(v.AG32,.75);assert.equal(v.AH32,8);
  const archivos=leerZipGuardado(generarExcel(plantilla,b,catalogos)),xml=new TextDecoder().decode(archivos.get('xl/worksheets/sheet1.xml'));
  for(const ref of ['J32:Q32','AA32:AB32','AC32:AD32','AE32:AF32','B33:X33','Z33:AH33'])assert.ok(xml.includes('ref="'+ref+'"'),ref);
  for(const ref of ['B32:X32','Z32:AH32'])assert.ok(!xml.includes('ref="'+ref+'"'),ref);
  assert.ok(xml.match(/<c\b[^>]*r="X32"[^>]*>[\s\S]*?<\/c>/)[0].includes('SUM(R32:S32,U32,V32)'));
  assert.ok(xml.match(/<c\b[^>]*r="AH32"[^>]*>[\s\S]*?<\/c>/)[0].includes('SUM(AE32,AG32)'));
});
test('El Excel guarda horas numéricas, códigos con ceros y el total como fórmula editable',()=>{
  let b=agregarPersonal(ejemplo(),'personal-323',catalogos);
  b=actualizarHorasPersonal(b,'personal-323',{ordinarias:'8',extras:'2,125',pagoExtras:'SI',traslado:'2',noTrabajadas:'1',justificacion:'6'});
  const v=valoresCeldas(b,catalogos);
  assert.equal(v.R22,8);assert.equal(v.S22,2.125);assert.equal(v.T22,'Si');assert.equal(v.U22,2);assert.equal(v.V22,1);assert.equal(v.W22,'6');assert.equal(v.X22,13.125);
  const files=leerZipGuardado(generarExcel(plantilla,b,catalogos)),xml=new TextDecoder().decode(files.get('xl/worksheets/sheet1.xml'));
  const total=xml.match(/<c\b[^>]*r="X22"[^>]*>[\s\S]*?<\/c>/)[0];
  assert.ok(total.includes('IF(COUNT(R22:S22,U22,V22)=0,&quot;&quot;,SUM(R22:S22,U22,V22))'));assert.ok(total.includes('<v>13.125</v>'));
  const pago=xml.match(/<c\b[^>]*r="T22"[^>]*>[\s\S]*?<\/c>/)[0];assert.ok(pago.includes('t="inlineStr"'));assert.ok(pago.includes('>Si</t>'));
  const horas=xml.match(/<c\b[^>]*r="S22"[^>]*>[\s\S]*?<\/c>/)[0];assert.ok(horas.includes('<v>2.125</v>'));
  const styles=new TextDecoder().decode(files.get('xl/styles.xml'));
  const formatos=styles.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)[1].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);
  assert.ok(formatos[Number(horas.match(/\bs="(\d+)"/)[1])].includes('numFmtId="0"'));
  const vacio=leerZipGuardado(generarExcel(plantilla,agregarPersonal(ejemplo(),'personal-323',catalogos),catalogos));
  const x=new TextDecoder().decode(vacio.get('xl/worksheets/sheet1.xml')).match(/<c\b[^>]*r="X22"[^>]*>[\s\S]*?<\/c>/)[0];
  assert.ok(x.includes('t="str"'));assert.ok(x.includes('<v/>'));assert.ok(!x.includes('<v>0</v>'));
});
