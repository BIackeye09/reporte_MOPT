import test from 'node:test';
import assert from 'node:assert/strict';
import {fechaDelHistorial,errorFechasHistorial,filtrarHistorial} from '../historial-filtros.mjs';

function entrada(id,fecha,modificado='2026-11-17T18:00:00Z',cambios={}) {
  return {id,modificado,creado:'2026-11-01T12:00:00Z',conjunto:{reportes:[{fecha,fechaTexto:fecha?fecha.split('-').reverse().join('/'):'',codigoCamino:'4-0771-00',codigoActividad:'153',inspectorTexto:'Inspectora de prueba',encargadoTexto:'José Pérez',observaciones:'',numeroReporteTexto:'1 / 1',...cambios}]}};
}
const ids=filas=>filas.map(e=>e.id);

test('La fecha del reporte manda aunque un reporte antiguo se guarde después',()=>{
  const filas=[entrada('viejo','2026-11-05','2026-11-20T12:00:00Z'),entrada('nuevo','2026-11-17','2026-11-17T12:00:00Z')];
  assert.deepEqual(ids(filtrarHistorial(filas)),['nuevo','viejo']);
  assert.deepEqual(ids(filtrarHistorial(filas,{orden:'fecha-asc'})),['viejo','nuevo']);
  assert.deepEqual(ids(filtrarHistorial(filas,{orden:'guardado-desc'})),['viejo','nuevo']);
});

test('Los límites Desde y Hasta son inclusivos y permiten buscar un único día',()=>{
  const filas=['2026-11-16','2026-11-17','2026-11-18','2026-12-01'].map((f,i)=>entrada(String(i),f));
  assert.deepEqual(ids(filtrarHistorial(filas,{desde:'2026-11-17',hasta:'2026-11-18'})),['2','1']);
  assert.deepEqual(ids(filtrarHistorial(filas,{desde:'2026-11-17',hasta:'2026-11-17'})),['1']);
  assert.deepEqual(ids(filtrarHistorial(filas,{desde:'2026-11-18'})),['3','2']);
  assert.deepEqual(ids(filtrarHistorial(filas,{hasta:'2026-11-16'})),['0']);
});

test('Los filtros funcionan al cruzar mes y año y con días bisiestos',()=>{
  const filas=[entrada('diciembre','2026-12-31'),entrada('enero','2027-01-01'),entrada('bisiesto','2024-02-29')];
  assert.deepEqual(ids(filtrarHistorial(filas,{desde:'2026-12-31',hasta:'2027-01-01'})),['enero','diciembre']);
  assert.deepEqual(ids(filtrarHistorial(filas,{desde:'2024-02-29',hasta:'2024-02-29'})),['bisiesto']);
  assert.equal(errorFechasHistorial({desde:'2024-02-29'}),'');
  for(const desde of ['2026-02-29','2026-11','1899-12-31','2101-01-01'])assert.ok(errorFechasHistorial({desde}));
});

test('Un intervalo invertido muestra un error y no se interpreta como otro rango',()=>{
  const filtros={desde:'2026-11-18',hasta:'2026-11-17'};
  assert.match(errorFechasHistorial(filtros),/Hasta.*Desde/);
  assert.deepEqual(filtrarHistorial([entrada('a','2026-11-17')],filtros),[]);
});

test('Los borradores sin fecha siguen visibles al final y se excluyen de intervalos',()=>{
  const filas=[entrada('pendiente',''),entrada('incompleta','2026-11'),entrada('con-fecha','2026-11-17')];
  for(const orden of ['fecha-desc','fecha-asc'])assert.deepEqual(ids(filtrarHistorial(filas,{orden})),['con-fecha','incompleta','pendiente']);
  assert.deepEqual(ids(filtrarHistorial(filas,{desde:'2026-11-01'})),['con-fecha']);
  assert.equal(fechaDelHistorial(filas[0]),null);assert.equal(fechaDelHistorial(filas[1]),null);
});

test('Escribir una fecha completa busca ese día exacto en formatos local e ISO',()=>{
  const filas=[entrada('correcto','2026-11-07'),entrada('texto','2026-11-08',undefined,{observaciones:'Visita del 07/11/2026'})];
  for(const busqueda of ['07/11/2026','7/11/2026','2026-11-07'])assert.deepEqual(ids(filtrarHistorial(filas,{busqueda})),['correcto']);
});

test('Fecha y búsqueda se combinan; se busca encargado sin distinguir acentos ni mayúsculas',()=>{
  const filas=[entrada('a','2026-11-17'),entrada('b','2026-11-18'),entrada('c','2026-11-17',undefined,{encargadoTexto:'María Fernández'})];
  assert.deepEqual(ids(filtrarHistorial(filas,{desde:'2026-11-17',hasta:'2026-11-17',busqueda:'JOSE PEREZ 4-0771'})),['a']);
  assert.deepEqual(ids(filtrarHistorial(filas,{busqueda:'maria fernandez'})),['c']);
  assert.deepEqual(filtrarHistorial(filas,{busqueda:'Sin coincidencias'}),[]);
});

test('La búsqueda conserva los datos de todas las continuaciones',()=>{
  const a=entrada('a','2026-11-17');a.conjunto.reportes.push({...a.conjunto.reportes[0],observaciones:'Puente La Esperanza',numeroReporteTexto:'2 / 2'});
  assert.deepEqual(ids(filtrarHistorial([a],{busqueda:'esperanza'})),['a']);
});

test('La ordenación es estable y compara instantes de guardado con sus zonas horarias',()=>{
  const a=entrada('a','2026-11-17','2026-11-17T09:00:00-06:00'),b=entrada('b','2026-11-17','2026-11-17T14:00:00Z');
  assert.deepEqual(ids(filtrarHistorial([b,a])),['a','b']);
  const c=entrada('c','2026-11-17',a.modificado);
  assert.deepEqual(ids(filtrarHistorial([c,a])),['a','c']);
});

test('Filtrar no modifica entradas, identificadores, datos ni orden del historial original',()=>{
  const filas=[entrada('a','2026-11-05'),entrada('b','2026-11-17')],antes=JSON.stringify(filas);
  filtrarHistorial(filas,{busqueda:'José',desde:'2026-11-01'});
  assert.equal(JSON.stringify(filas),antes);
  assert.deepEqual(ids(filtrarHistorial(filas)),['b','a']);
});
