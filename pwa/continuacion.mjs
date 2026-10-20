import {nuevoEncabezado,leerBorrador,FILAS_PERSONAL,agregarPersonal,guardarPersonalManual,personalDelReporte,equipoDelReporte,personalRepetido,equipoRepetido,agregarEquipo,guardarEquipoManual,errores} from './core.mjs';

// Las estaciones y su diferencia son comunes. Las listas, horas, producción,
// problema, observaciones y acarreos siguen perteneciendo a cada reporte.
const CABECERA=Object.freeze(['codigoCamino','codigoActividad','fecha','fechaTexto','idCatalogo','inspectorTexto']);
export const CAMPOS_ESTACIONES=Object.freeze(['estacionamientoInicioTexto','estacionamientoFinalTexto']);
export const CAMPOS_COMPARTIDOS=Object.freeze([...CABECERA,...CAMPOS_ESTACIONES]);
const compartidos=b=>Object.fromEntries(CAMPOS_COMPARTIDOS.map(k=>[k,b[k]]));
export function numerar(c) {
  return {...c,reportes:c.reportes.map((b,i)=>({...b,numeroReporteTexto:(i+1)+' / '+c.reportes.length}))};
}
export function nuevoConjunto(b=nuevoEncabezado()) {
  return numerar({tipo:'mopt.conjunto',version:3,activo:0,reportes:[b],estacionesPrevias:[]});
}
export function leerConjunto(texto) {
  const c=JSON.parse(texto);
  if(c.tipo!=='mopt.conjunto')return nuevoConjunto(leerBorrador(texto));
  if(![1,2,3].includes(c.version)||!Array.isArray(c.reportes)||!c.reportes.length||!Number.isInteger(c.activo)||c.activo<0||c.activo>=c.reportes.length)
    throw new Error('Conjunto de reportes inválido.');
  let reportes=c.reportes.map(b=>leerBorrador(JSON.stringify(b)));const base=compartidos(reportes[0]);
  if(reportes.some(b=>(c.version===1?CABECERA:CAMPOS_COMPARTIDOS).some(k=>b[k]!==base[k])))throw new Error('Los encabezados guardados no coinciden.');
  let estacionesPrevias=c.estacionesPrevias??[];
  if(!Array.isArray(estacionesPrevias)||estacionesPrevias.some(f=>!f||!Number.isInteger(f.reporte)||f.reporte<1||CAMPOS_ESTACIONES.some(k=>typeof f[k]!=='string')))throw new Error('Referencia de estaciones inválida.');
  if(c.version===1){
    // El reporte 1 define las estaciones comunes. Se conservan como referencia
    // los valores diferentes de las antiguas continuaciones, sin perderlos.
    estacionesPrevias=[...estacionesPrevias,...reportes.flatMap((b,i)=>i&&CAMPOS_ESTACIONES.some(k=>b[k]!==base[k])&&CAMPOS_ESTACIONES.some(k=>b[k].trim())?[{reporte:i+1,...Object.fromEntries(CAMPOS_ESTACIONES.map(k=>[k,b[k]]))}]:[])];
    reportes=reportes.map(b=>({...b,...base}));
  }
  return numerar({...c,version:3,reportes,estacionesPrevias});
}
export function actualizarReporte(c,b) {
  const base=compartidos(b);
  return numerar({...c,reportes:c.reportes.map((anterior,i)=>({... (i===c.activo?b:anterior),...base}))});
}
function comprobarDuplicado(c,tipo,fila,catalogos,editando=null) {
  const personal=tipo==='personal',resolver=personal?personalDelReporte:equipoDelReporte,repetido=personal?personalRepetido:equipoRepetido;
  for(const [i,b] of c.reportes.entries())for(const entrada of b[tipo]) {
    const id=personal?entrada:entrada.id;
    if(i===c.activo&&id===editando)continue;
    const f=resolver(b,id,catalogos);
    if(f&&repetido(f,fila))throw new Error((personal?'Ya existe un trabajador con ese nombre o esa cédula':'Ya existe un equipo con ese N.º de equipo')+' en el reporte '+(i+1)+' / '+c.reportes.length+'.');
  }
}
export function destinoParaPersonal(c) {
  if(c.reportes[c.activo].personal.length<FILAS_PERSONAL.length)return c.activo;
  const siguiente=c.reportes.findIndex((b,i)=>i>c.activo&&b.personal.length<FILAS_PERSONAL.length);
  return siguiente<0?c.reportes.length:siguiente;
}
// Un error o duplicado nunca crea una hoja. El trabajador se agrega al destino,
// pero el usuario permanece en su reporte actual, sin redirecciones.
export function agregarTrabajador(c,entrada,catalogos) {
  const actual=c.reportes[c.activo],edicion=entrada.editando??null;
  let prueba;
  if(entrada.datos) {
    const vacio=edicion?actual:{...nuevoEncabezado(),...compartidos(actual)};
    prueba=guardarPersonalManual(vacio,entrada.datos,catalogos,edicion);
  }else prueba=agregarPersonal({...nuevoEncabezado(),...compartidos(actual)},entrada.id,catalogos);
  const id=entrada.datos?(edicion??prueba.personal.at(-1)):entrada.id;
  comprobarDuplicado(c,'personal',personalDelReporte(prueba,id,catalogos),catalogos,edicion);
  if(edicion)return actualizarReporte(c,prueba);
  const destino=destinoParaPersonal(c),reportes=[...c.reportes];
  if(destino===reportes.length)reportes.push({...nuevoEncabezado(),...compartidos(actual)});
  let b=reportes[destino];
  if(entrada.datos)b={...b,personalManual:[...b.personalManual,prueba.personalManual.find(f=>f.id===id)]};
  reportes[destino]=agregarPersonal(b,id,catalogos);
  return numerar({...c,reportes});
}
export function registrarEquipo(c,entrada,catalogos) {
  const actual=c.reportes[c.activo],edicion=entrada.editando??null;
  const prueba=entrada.datos?guardarEquipoManual(actual,entrada.datos,catalogos,edicion):agregarEquipo(actual,entrada.id,catalogos);
  const id=entrada.datos?(edicion??prueba.equipos.at(-1).id):entrada.id;
  comprobarDuplicado(c,'equipos',equipoDelReporte(prueba,id,catalogos),catalogos,edicion);
  return actualizarReporte(c,prueba);
}
// También se revisan los borradores existentes: ningún duplicado anterior
// puede pasar a las exportaciones por haberse guardado en otra versión.
export function erroresConjunto(c,catalogos) {
  const resultado=c.reportes.map(b=>errores(b,catalogos)),vistos={personal:[],equipos:[]};
  for(const [i,b] of c.reportes.entries())for(const tipo of ['personal','equipos']) {
    const personal=tipo==='personal',resolver=personal?personalDelReporte:equipoDelReporte,repetido=personal?personalRepetido:equipoRepetido;
    for(const entrada of b[tipo]) {
      const f=resolver(b,personal?entrada:entrada.id,catalogos);if(!f)continue;
      const previo=vistos[tipo].find(v=>repetido(v.f,f));
      if(previo&&!resultado[i][tipo])resultado[i][tipo]=(personal?'Nombre o cédula de personal repetidos':'N.º de equipo repetido')+' respecto al reporte '+(previo.i+1)+'. Corrige o retira el registro duplicado.';
      vistos[tipo].push({i,f});
    }
  }
  return resultado;
}
export function puedeQuitarContinuacion(c) {
  if(c.activo===0)return false;
  const b=c.reportes[c.activo];
  return ['personal','equipos','materiales','personalManual','equiposManuales'].every(k=>!b[k].length)&&
    ['produccionTexto','senasInicio','problema','longitudTexto','observaciones'].every(k=>!b[k].trim())&&
    ['horasPersonal','horasEquipos','acarreos','pagosAnteriores'].every(k=>!Object.keys(b[k]).length);
}
export function quitarContinuacion(c) {
  if(!puedeQuitarContinuacion(c))throw new Error('Sólo se puede quitar una continuación completamente vacía.');
  return numerar({...c,activo:c.activo-1,reportes:c.reportes.filter((_,i)=>i!==c.activo)});
}
