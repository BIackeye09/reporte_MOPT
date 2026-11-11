import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crearCatalogos,nuevoEncabezado,leerBorrador,encargadoVisible,errorEncargado,errores,generarExcel} from '../core.mjs';
import {nuevoConjunto,leerConjunto,agregarTrabajador,actualizarReporte} from '../continuacion.mjs';
import {generarExcelConjunto} from '../excel-conjunto.mjs';
import {tieneContenido} from '../historial.mjs';

const datos=JSON.parse(fs.readFileSync(new URL('../assets/catalogos.json',import.meta.url)));
const cat=crearCatalogos(datos),plantilla=JSON.parse(fs.readFileSync(new URL('../assets/plantilla-excel.json',import.meta.url)));
const base=()=>({...nuevoEncabezado(),codigoCamino:'4-0771-00',codigoActividad:'280',inspectorTexto:'Inspectora de prueba'});
function unzip(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};let p=0;
  while(v.getUint32(p,true)===0x04034b50){const t=v.getUint32(p+18,true),n=v.getUint16(p+26,true),e=v.getUint16(p+28,true),s=p+30+n+e;out[new TextDecoder().decode(bytes.slice(p+30,p+30+n))]=new TextDecoder().decode(bytes.slice(s,s+t));p=s+t;}
  return out;
}
const celda=(xml,ref)=>xml.match(new RegExp('<c\\b[^>]*r="'+ref+'"[^>]*?(?:/>|>[\\s\\S]*?</c>)'))?.[0];

test('El encargado es opcional; borradores anteriores y respaldos conservan los datos',()=>{
  const anterior=base();delete anterior.encargadoTexto;
  assert.deepEqual(leerBorrador(JSON.stringify(anterior)),{...anterior,encargadoTexto:''});
  const c=nuevoConjunto({...base(),encargadoTexto:'José Pérez'});
  assert.deepEqual(leerConjunto(JSON.stringify(c)),c);
  assert.equal(tieneContenido(nuevoConjunto({...nuevoEncabezado(),encargadoTexto:'José Pérez'})),true);
  assert.throws(()=>leerBorrador(JSON.stringify({...base(),encargadoTexto:123})),/inválido/);
});

test('El encargado valida una línea de hasta 100 caracteres sin exigir un nombre',()=>{
  for(const t of ['', 'José Pérez', 'X'.repeat(100),'=Nombre & <literal>'])assert.equal(errorEncargado(t),'');
  for(const t of ['X'.repeat(101),'Nombre\nApellido',42])assert.ok(errorEncargado(t));
  assert.equal(encargadoVisible({...base(),encargadoTexto:'  José   Pérez  '}),'José Pérez');
  assert.ok(errores({...base(),encargadoTexto:'Nombre\nApellido'},cat).encargado);
  assert.equal(errores(base(),cat).encargado,undefined);
});

test('Crear y editar continuaciones comparte el encargado y lo exporta en cada frente',()=>{
  let c=nuevoConjunto({...base(),encargadoTexto:'José Pérez'});
  for(let i=1;i<=12;i++)c=agregarTrabajador(c,{datos:{nombre:'Persona encargado '+i,cedula:'0-0000-'+String(i).padStart(4,'0'),codigo:'01'}},cat);
  assert.equal(c.reportes.length,2);assert.ok(c.reportes.every(b=>b.encargadoTexto==='José Pérez'));
  c={...c,activo:1};c=actualizarReporte(c,{...c.reportes[1],encargadoTexto:'María Fernández'});
  assert.ok(c.reportes.every(b=>b.encargadoTexto==='María Fernández'));
  assert.deepEqual(leerConjunto(JSON.stringify(c)),c);
  const z=unzip(generarExcelConjunto(plantilla,c.reportes,cat));
  for(const n of [1,3])assert.match(celda(z['xl/worksheets/sheet'+n+'.xml'],'U43'),/María Fernández/);
});

test('Excel cambia solamente el nombre del encargado y conserva rótulos, inspector y reverso',()=>{
  const anterior=unzip(generarExcel(plantilla,base(),cat));
  for(const encargadoTexto of ['José Pérez','=Nombre & <literal>','']){
    const z=unzip(generarExcel(plantilla,{...base(),encargadoTexto},cat));
    const hoja=z['xl/worksheets/sheet1.xml'];
    const quitarNombre=h=>h.replace(celda(h,'U43'),'');
    assert.equal(quitarNombre(hoja),quitarNombre(anterior['xl/worksheets/sheet1.xml']));
    assert.ok(hoja.includes('ref="U43:AG43"'));
    if(encargadoTexto){assert.match(celda(hoja,'U43'),/t="inlineStr"/);assert.doesNotMatch(celda(hoja,'U43'),/<f[ >]/);}
    for(const ref of ['U44','U45','U46'])assert.equal(celda(hoja,ref),celda(anterior['xl/worksheets/sheet1.xml'],ref));
    for(const nombre of Object.keys(z).filter(n=>n!=='xl/worksheets/sheet1.xml'))assert.equal(z[nombre],anterior[nombre]);
  }
});
