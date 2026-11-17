import test from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHistorial} from '../historial-ui.mjs';

// Superficie DOM mínima para probar eventos y sus efectos sin dependencias.
class Elemento {
  constructor(tag,doc){this.tagName=tag;this.doc=doc;this.children=[];this.dataset={};this.eventos={};this.atributos={};this.value='';this.hidden=false;this.disabled=false;this._texto='';}
  append(...hijos){this.children.push(...hijos);}
  replaceChildren(...hijos){this.children=[...hijos];this._texto='';}
  get textContent(){return this._texto+this.children.map(h=>h.textContent).join('');}
  set textContent(texto){this._texto=String(texto);this.children=[];}
  setAttribute(k,v){this.atributos[k]=v;}
  addEventListener(nombre,accion){(this.eventos[nombre]??=[]).push(accion);}
  async emitir(nombre){if(this.disabled)return;for(const accion of this.eventos[nombre]??[])await accion();}
  querySelectorAll(selector){const tags=selector.split(',');return this.children.flatMap(h=>[...(tags.includes(h.tagName)?[h]:[]),...h.querySelectorAll(selector)]);}
  focus(){this.doc.activeElement=this;}
  scrollIntoView(){}
  click(){return this.emitir('click');}
}
const entrada=(id,fecha,cambios={})=>({id,modificado:'2026-11-17T18:00:00Z',conjunto:{reportes:[{fecha,fechaTexto:'',codigoCamino:id,codigoActividad:'153',encargadoTexto:'José Pérez',inspectorTexto:'Inspectora',numeroReporteTexto:'1 / 1',observaciones:'',personal:[],...cambios}]}});
const ejemplos=()=>[entrada('reporte-a','2026-11-17'),entrada('reporte-b','2026-11-17',{encargadoTexto:'María Fernández'}),entrada('reporte-c','2026-11-16'),entrada('reporte-pendiente','')];
async function preparar(filas=ejemplos()){
  const ids=new Map(),doc={activeElement:null,getElementById:id=>ids.get(id),createElement:tag=>new Elemento(tag,doc)};
  const agregar=(id,tag='div')=>{const e=new Elemento(tag,doc);e.id=id;ids.set(id,e);return e;};
  const panel=agregar('historial-reportes','details');
  for(const [tag,nombres] of [['input',['buscar-historial','fecha-desde-historial','fecha-hasta-historial','archivo-historial']],['button',['limpiar-filtros-historial','historial','mas-historial','actualizar-historial','respaldar-historial','importar-historial']],['select',['orden-historial']],['div',['estado-historial','cantidad-historial','lista-historial','error-fechas-historial','formulario']]])for(const id of nombres)panel.append(agregar(id,tag));
  ids.get('orden-historial').value='fecha-desc';globalThis.document=doc;
  const acciones={abrir:[],ver:[],exportar:[],descargas:[],guardados:0};
  const ui=iniciarHistorial({almacen:{listar:async()=>structuredClone(filas),respaldo:async()=>({reportes:filas}),importar:async()=>({agregados:0,omitidos:0,copias:0})},leerActual:()=>({historialId:'reporte-a'}),guardarActual:async()=>{acciones.guardados++;return true;},abrir:async id=>acciones.abrir.push(id),ver:async id=>acciones.ver.push(id),exportar:async(tipo,id)=>acciones.exportar.push([tipo,id]),descargar:bytes=>acciones.descargas.push(JSON.parse(new TextDecoder().decode(bytes)))});
  await ui.refrescar();
  return {ui,filas,acciones,$:id=>ids.get(id),articulos:()=>ids.get('lista-historial').querySelectorAll('article'),grupos:()=>ids.get('lista-historial').querySelectorAll('section')};
}
const idsVisibles=h=>h.articulos().map(e=>e.dataset.historialId);

test('El historial agrupa por fecha y coloca los borradores sin fecha al final',async()=>{
  const h=await preparar();assert.deepEqual(idsVisibles(h),['reporte-a','reporte-b','reporte-c','reporte-pendiente']);
  assert.deepEqual(h.grupos().map(g=>g.children[0].textContent),['Reportes del 17/11/2026','Reportes del 16/11/2026','Sin fecha completa']);
  assert.ok(h.articulos()[0].textContent.includes('Actual'));assert.equal(h.$('limpiar-filtros-historial').disabled,true);
  h.$('orden-historial').value='fecha-asc';await h.$('orden-historial').emitir('change');
  assert.equal(h.grupos()[0].children[0].textContent,'Reportes del 16/11/2026');
  h.$('orden-historial').value='guardado-desc';await h.$('orden-historial').emitir('change');
  assert.equal(h.grupos().length,0);assert.match(h.articulos()[0].children[0].textContent,/17\/11\/2026/);
});

test('Desde, Hasta y encargado se combinan; limpiar recupera la vista completa',async()=>{
  const h=await preparar();h.$('fecha-desde-historial').value='2026-11-17';await h.$('fecha-desde-historial').emitir('input');
  h.$('fecha-hasta-historial').value='2026-11-17';await h.$('fecha-hasta-historial').emitir('input');
  h.$('buscar-historial').value='MARIA';await h.$('buscar-historial').emitir('input');
  assert.deepEqual(idsVisibles(h),['reporte-b']);assert.match(h.$('cantidad-historial').textContent,/1 de 4 conjuntos/);
  await h.$('limpiar-filtros-historial').emitir('click');assert.equal(h.articulos().length,4);
  for(const id of ['buscar-historial','fecha-desde-historial','fecha-hasta-historial'])assert.equal(h.$(id).value,'');
  assert.equal(h.$('orden-historial').value,'fecha-desc');assert.equal(h.acciones.guardados,0);
});

test('El rango invertido informa el error y se corrige al limpiar los filtros',async()=>{
  const h=await preparar();h.$('fecha-desde-historial').value='2026-11-18';h.$('fecha-hasta-historial').value='2026-11-17';await h.$('fecha-desde-historial').emitir('input');
  assert.match(h.$('error-fechas-historial').textContent,/Hasta.*Desde/);assert.equal(h.articulos().length,0);assert.equal(h.$('mas-historial').hidden,true);
  await h.$('limpiar-filtros-historial').emitir('click');assert.equal(h.$('error-fechas-historial').textContent,'');assert.equal(h.articulos().length,4);
});

test('Actualizar y respaldar respetan la búsqueda sin recortar el respaldo',async()=>{
  const h=await preparar();h.$('buscar-historial').value='MARIA';await h.$('buscar-historial').emitir('input');
  await h.$('actualizar-historial').emitir('click');assert.deepEqual(idsVisibles(h),['reporte-b']);assert.equal(h.$('buscar-historial').value,'MARIA');
  await h.$('respaldar-historial').emitir('click');assert.equal(h.acciones.descargas[0].reportes.length,4);assert.deepEqual(idsVisibles(h),['reporte-b']);assert.equal(h.$('orden-historial').disabled,false);
});

test('Los botones de un resultado filtrado conservan el identificador correcto',async()=>{
  const h=await preparar();h.$('buscar-historial').value='MARIA';await h.$('buscar-historial').emitir('input');
  const boton=texto=>h.articulos()[0].querySelectorAll('button').find(b=>b.textContent===texto);
  await boton('Consultar').emitir('click');await boton('Excel').emitir('click');await boton('Abrir para editar').emitir('click');
  assert.deepEqual(h.acciones.ver,['reporte-b']);assert.deepEqual(h.acciones.exportar,[['excel','reporte-b']]);assert.deepEqual(h.acciones.abrir,['reporte-b']);
});

test('Mostrar más y cambiar filtros mantienen la paginación y los grupos coherentes',async()=>{
  const filas=Array.from({length:45},(_,i)=>entrada('reporte-'+String(i).padStart(2,'0'),i<25?'2026-11-17':'2026-11-16'));
  const h=await preparar(filas);assert.equal(h.articulos().length,20);assert.equal(h.$('mas-historial').hidden,false);
  await h.$('mas-historial').emitir('click');assert.equal(h.articulos().length,40);assert.equal(h.grupos().length,2);
  h.$('fecha-desde-historial').value='2026-11-17';await h.$('fecha-desde-historial').emitir('input');assert.equal(h.articulos().length,20);
  await h.$('mas-historial').emitir('click');assert.equal(h.articulos().length,25);assert.equal(h.grupos().length,1);assert.equal(h.$('mas-historial').hidden,true);
  assert.equal(new Set(idsVisibles(h)).size,25);
});

test('Sin resultados se ofrece limpiar y un historial vacío conserva su explicación',async()=>{
  const h=await preparar();h.$('buscar-historial').value='No existe';await h.$('buscar-historial').emitir('input');
  assert.match(h.$('lista-historial').textContent,/Limpiar filtros/);assert.equal(h.$('mas-historial').hidden,true);
  const vacio=await preparar([]);assert.match(vacio.$('lista-historial').textContent,/guardarán aquí automáticamente/);
});
