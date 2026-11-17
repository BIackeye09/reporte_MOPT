import {coincide,fechaValida,fechaVisible,fechaDeTexto} from './core.mjs';

// La fecha civil del reporte es independiente del momento en que se guarda.
// Se compara como YYYY-MM-DD para evitar cambios por zona horaria.
export function fechaDelHistorial(entrada) {
  const fecha=entrada.conjunto.reportes[0]?.fecha;
  return fechaValida(fecha)?fecha:null;
}
export function errorFechasHistorial({desde='',hasta=''}={}) {
  if((desde&&!fechaValida(desde))||(hasta&&!fechaValida(hasta)))return 'Selecciona fechas completas entre 1900 y 2100.';
  return desde&&hasta&&desde>hasta?'La fecha Hasta debe ser igual o posterior a Desde.':'';
}
const ultimoGuardado=entrada=>Date.parse(entrada.modificado)||0;
export function filtrarHistorial(entradas,{busqueda='',desde='',hasta='',orden='fecha-desc'}={}) {
  if(errorFechasHistorial({desde,hasta}))return [];
  const consulta=busqueda.trim(),diaBuscado=fechaDeTexto(consulta)||(fechaValida(consulta)?consulta:null);
  return entradas.filter(entrada=>{
    const fecha=fechaDelHistorial(entrada);
    if((desde||hasta)&&(!fecha||(desde&&fecha<desde)||(hasta&&fecha>hasta)))return false;
    if(diaBuscado)return fecha===diaBuscado;
    const texto=entrada.conjunto.reportes.map(b=>[b.fecha,fechaVisible(b.fecha),b.fechaTexto,b.codigoCamino,b.codigoActividad,b.inspectorTexto,b.encargadoTexto,b.observaciones,b.numeroReporteTexto].join(' ')).join(' ');
    return coincide(texto,consulta);
  }).sort((a,b)=>{
    const desempate=()=>ultimoGuardado(b)-ultimoGuardado(a)||a.id.localeCompare(b.id);
    if(orden==='guardado-desc')return desempate();
    const fa=fechaDelHistorial(a),fb=fechaDelHistorial(b);
    // Los borradores sin fecha completa quedan al final en ambos sentidos.
    if(!fa||!fb)return fa?-1:fb?1:desempate();
    return (orden==='fecha-asc'?fa.localeCompare(fb):fb.localeCompare(fa))||desempate();
  });
}
