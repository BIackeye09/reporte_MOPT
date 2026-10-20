// Los datos manuales pertenecen al borrador: nunca modifican los catálogos.
export const personalDelReporte=(b,id,catalogos)=>catalogos.personal.get(id)??b.personalManual?.find(f=>f.id===id);
export const equipoDelReporte=(b,id,catalogos)=>catalogos.equipos.get(id)??b.equiposManuales?.find(f=>f.id===id);
const textoValido=(t,max)=>typeof t==='string'&&t.trim().length<=max&&!/[\u0000-\u001F\u007F]/.test(t);
export function erroresPersonalManual(d={}) {
  const e={};
  if(!textoValido(d.nombre,160)||!d.nombre.trim())e.nombre='Escribe el nombre y los apellidos, hasta 160 caracteres.';
  if(typeof d.cedula!=='string'||! /^(?:\d{9}|\d-\d{4}-\d{4})$/.test(d.cedula.trim()))e.cedula='Escribe la cédula como X-XXXX-XXXX o sus nueve dígitos.';
  if(typeof d.codigo!=='string'||! /^(?:\d{1,2}|-)$/.test(d.codigo.trim()))e.codigo='Escribe el código (D) de uno o dos dígitos, o - si no está disponible.';
  return e;
}
export function erroresEquipoManual(d={}) {
  const e={};
  if(typeof d.codigoEquipo!=='string'||! /^\d{1,3}$/.test(d.codigoEquipo.trim()))e.codigoEquipo='Escribe el COD. (F) de uno a tres dígitos.';
  if(typeof d.numeroEquipo!=='string'||! /^\d{1,12}$/.test(d.numeroEquipo.trim()))e.numeroEquipo='Escribe el número de equipo, hasta doce dígitos. Se conservan los ceros iniciales.';
  if(!textoValido(d.descripcion??'',120))e.descripcion='Escribe una descripción de hasta 120 caracteres, sin saltos de línea.';
  return e;
}
export function datosPersonalManual(d,id) {
  const e=erroresPersonalManual(d);if(Object.keys(e).length)throw new Error(Object.values(e)[0]);
  const n=d.cedula.trim().replaceAll('-','');
  return {id,nombre:d.nombre.trim().replace(/\s+/g,' '),cedula:n[0]+'-'+n.slice(1,5)+'-'+n.slice(5),
    codigo:d.codigo.trim()==='-'?'-':d.codigo.trim().padStart(2,'0'),regional:'Ingreso manual',manual:true};
}
export function datosEquipoManual(d,id) {
  const e=erroresEquipoManual(d);if(Object.keys(e).length)throw new Error(Object.values(e)[0]);
  const codigoEquipo=d.codigoEquipo.trim().padStart(3,'0'),numeroEquipo=d.numeroEquipo.trim();
  return {id,codigoEquipo,numeroEquipo,codigoPorComponentes:codigoEquipo+'-'+numeroEquipo,
    descripcion:d.descripcion?.trim()||'Equipo ingresado manualmente',regional:'Ingreso manual',manual:true};
}
export function nuevoIdManual(tipo) {
  const sufijo=globalThis.crypto?.randomUUID?.()??Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  return 'manual-'+tipo+'-'+sufijo;
}
export function leerManuales(b,tipo) {
  const esPersonal=tipo==='personal',campo=esPersonal?'personalManual':'equiposManuales',datos=b[campo];
  if(b.version<10)return [];
  if(!Array.isArray(datos)||datos.length>11)throw new Error('Registros manuales inválidos.');
  const patron=esPersonal?/^manual-personal-[A-Za-z0-9-]{1,80}$/:/^manual-equipo-[A-Za-z0-9-]{1,80}$/;
  const ids=b[tipo].map(f=>esPersonal?f:f.id);
  if(new Set(datos.map(f=>f?.id)).size!==datos.length)throw new Error('Registros manuales repetidos.');
  const resultado=datos.map(f=>{
    if(!f||!patron.test(f.id)||!ids.includes(f.id))throw new Error('Registro manual inválido.');
    return esPersonal?datosPersonalManual(f,f.id):datosEquipoManual(f,f.id);
  });
  if(ids.some(id=>id.startsWith('manual-')&&!resultado.some(f=>f.id===id)))throw new Error('Faltan los datos del registro manual.');
  return resultado;
}
