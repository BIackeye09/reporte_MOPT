import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,guardarPersonalManual,guardarEquipoManual,agregarEquipo,actualizarHorasPersonal,actualizarHorasEquipo,retirarPersonal,errores,horasHombreExactas,esHorasHombre,produccionExactaDelReporte,produccionDelReporte,confirmarProduccionVacia,generarExcel,FILAS_EQUIPOS,equipoCompleto} from '../core.mjs';
import {nuevoConjunto,agregarTrabajador,actualizarReporte,leerConjunto} from '../continuacion.mjs';
import {generarExcelConjunto} from '../excel-conjunto.mjs';
const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const cat=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const base=()=>({...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:'153',produccionTexto:'999'});
const persona=i=>({nombre:'Persona horas hombre '+i,cedula:'0-0000-'+String(i).padStart(4,'0'),codigo:'01'});
const conPersonal=n=>{let b=base();for(let i=1;i<=n;i++)b=guardarPersonalManual(b,persona(i),cat);return b;};
function unzip(bytes){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};let p=0;while(v.getUint32(p,true)===0x04034b50){const t=v.getUint32(p+18,true),n=v.getUint16(p+26,true),e=v.getUint16(p+28,true),s=p+30+n+e;out[new TextDecoder().decode(bytes.slice(p+30,p+30+n))]=new TextDecoder().decode(bytes.slice(s,s+t));p=s+t;}return out;}
const celda=(xml,ref)=>xml.match(new RegExp('<c\\b[^>]*r="'+ref+'"[^>]*?(?:/>|>[\\s\\S]*?</c>)'))[0];

test('Las cinco actividades hh se reconocen por su unidad, incluidas mayúsculas',()=>{
  const hh=datos.actividades.filter(a=>a.unidad==='hh');assert.equal(hh.length,5);
  for(const a of hh)assert.equal(esHorasHombre({...base(),codigoActividad:a.codigo},cat),true);
  for(const unidad of ['HH','hH',' hh ']){
    const actividades=new Map(cat.actividades);actividades.set('153',{...actividades.get('153'),unidad});
    assert.equal(esHorasHombre(base(),{...cat,actividades}),true);
  }
  for(const codigoActividad of ['1','280','533','534'])assert.equal(esHorasHombre({...base(),codigoActividad},cat),false);
});

test('hh suma los totales del personal, se recalcula al editar y retirar y excluye equipos',()=>{
  let b=conPersonal(3);const [p,q]=b.personal;
  b=actualizarHorasPersonal(b,p,{ordinarias:'8',extras:'1',pagoExtras:'SI',traslado:'0,25',noTrabajadas:'0,5'});
  b=actualizarHorasPersonal(b,q,{ordinarias:'8'});
  b=guardarEquipoManual(b,{numeroEquipo:'0007',codigoEquipo:'232'},cat);
  b=actualizarHorasEquipo(b,b.equipos[0].id,{trabajadas:'100'});
  assert.equal(horasHombreExactas(b),'17.75');assert.equal(produccionDelReporte(b,cat),17.75);
  assert.equal(produccionExactaDelReporte(b,cat),'17.75');assert.deepEqual(errores(b,cat),{});
  b=actualizarHorasPersonal(b,p,{ordinarias:'7,5'});assert.equal(produccionExactaDelReporte(b,cat),'17.25');
  b=retirarPersonal(b,p);assert.equal(produccionExactaDelReporte(b,cat),'8');assert.equal(b.equipos.length,1);
  assert.equal(produccionExactaDelReporte({...b,codigoActividad:'280'},cat),'999');
});

test('Horas vacías, cero e incompletas se distinguen sin sumar resultados parciales',()=>{
  let b=conPersonal(2);assert.equal(produccionExactaDelReporte(b,cat),null);
  b=actualizarHorasPersonal(b,b.personal[0],{ordinarias:'0'});assert.equal(produccionExactaDelReporte(b,cat),'0');
  b=actualizarHorasPersonal(b,b.personal[1],{ordinarias:'1,'});assert.equal(produccionExactaDelReporte(b,cat),null);assert.ok(errores(b,cat).personal);
  b=actualizarHorasPersonal(b,b.personal[1],{ordinarias:'0,1'});
  b=actualizarHorasPersonal(b,b.personal[0],{ordinarias:'0,2'});assert.equal(produccionExactaDelReporte(b,cat),'0.3');
});

test('Excel enlaza hh a las horas con fórmula editable y conserva las cifras que exceden su precisión',()=>{
  let b=conPersonal(2);const [p,q]=b.personal;
  b=actualizarHorasPersonal(b,p,{ordinarias:'0,1'});b=actualizarHorasPersonal(b,q,{ordinarias:'0,2'});
  const z=unzip(generarExcel(plantilla,b,cat)),c=celda(z['xl/worksheets/sheet1.xml'],'AD11');
  assert.match(c,/<f>IF\(COUNT\(R22:S32,U22:V32\)=0,/);assert.match(c,/<v>0.3<\/v>/);assert.doesNotMatch(c,/ROUND/);
  b=actualizarHorasPersonal(b,p,{ordinarias:'0,123456789012345678901'});b=actualizarHorasPersonal(b,q,{ordinarias:'0,000000000000000000001'});
  const literal=celda(unzip(generarExcel(plantilla,b,cat))['xl/worksheets/sheet1.xml'],'AD11');
  assert.match(literal,/t="inlineStr"/);assert.match(literal,/0,123456789012345678902/);assert.doesNotMatch(literal,/<f>/);
});

test('Cada continuación suma sus propios trabajadores y recupera el cálculo desde el respaldo',()=>{
  let c=nuevoConjunto(base());
  for(let i=1;i<=12;i++)c=agregarTrabajador(c,{datos:persona(i)},cat);
  for(let i=0;i<c.reportes.length;i++){
    c={...c,activo:i};let b=c.reportes[i];for(const id of b.personal)b=actualizarHorasPersonal(b,id,{ordinarias:i?'5':'8'});c=actualizarReporte(c,b);
  }
  c=leerConjunto(JSON.stringify(c));assert.deepEqual(c.reportes.map(b=>produccionExactaDelReporte(b,cat)),['88','5']);
  const z=unzip(generarExcelConjunto(plantilla,c.reportes,cat));
  assert.match(celda(z['xl/worksheets/sheet1.xml'],'AD11'),/<v>88<\/v>/);
  assert.match(celda(z['xl/worksheets/sheet3.xml'],'AD11'),/<v>5<\/v>/);
});

test('Sin personal se permiten once equipos y se conserva el límite físico de la plantilla',()=>{
  let b={...base(),codigoActividad:'280'};const equipos=datos.equipos.filter(equipoCompleto);
  for(const f of equipos.slice(0,FILAS_EQUIPOS.length))b=agregarEquipo(b,f.id,cat);
  assert.equal(b.personal.length,0);assert.equal(b.equipos.length,11);assert.deepEqual(errores(b,cat),{});
  assert.throws(()=>agregarEquipo(b,equipos[11].id,cat),/11 equipos/);assert.doesNotThrow(()=>generarExcel(plantilla,b,cat));
});

test('Guardar y descargar permiten aceptar producción vacía o cancelar, con un aviso por conjunto',()=>{
  const reportes=[{...base(),codigoActividad:'280',produccionTexto:'',numeroReporteTexto:'1 / 2'},{...base(),numeroReporteTexto:'2 / 2'}];
  for(const accion of ['guardar','descargar'])for(const aceptar of [true,false]){
    const antes=JSON.stringify(reportes);let avisos=0;
    const decision=confirmarProduccionVacia(reportes,cat,accion,texto=>{avisos++;assert.match(texto,/1 \/ 2, 2 \/ 2/);assert.ok(texto.includes('Aceptar: '+accion));assert.match(texto,/Cancelar/);return aceptar;});
    assert.equal(decision.aceptado,aceptar);assert.deepEqual(decision.indices,[0,1]);assert.equal(avisos,1);assert.equal(JSON.stringify(reportes),antes);
  }
});

test('Una producción manual o calculada de cero permite continuar sin avisar',()=>{
  let hh=conPersonal(1);hh=actualizarHorasPersonal(hh,hh.personal[0],{ordinarias:'0'});
  const reportes=[{...base(),codigoActividad:'280',produccionTexto:'0'},hh];
  const d=confirmarProduccionVacia(reportes,cat,'descargar',()=>assert.fail('Cero no debe avisar'));
  assert.deepEqual(d,{aceptado:true,indices:[]});
});
