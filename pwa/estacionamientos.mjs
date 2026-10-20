import {esAcarreo} from './acarreos-reglas.mjs';

// Se calcula en metros enteros: la resta no acumula errores decimales.
export function metrosEstacionamiento(texto='') {
  if(typeof texto!=='string'||!/^\d+(?:[.,]\d{1,3})?$/.test(texto.trim()))return null;
  const [km,m='']=texto.trim().replace(',','.').split('.');
  const valor=Number(km+m.padEnd(3,'0'));
  return Number.isSafeInteger(valor)?valor:null;
}
export function estacionamientoVisible(texto) {
  const m=metrosEstacionamiento(texto);
  return m===null?'':Math.floor(m/1000)+' + '+String(m%1000).padStart(3,'0');
}
export function erroresEstacionamientos(b) {
  if(esAcarreo(b))return {};
  const inicio=b.estacionamientoInicioTexto??'',fin=b.estacionamientoFinalTexto??'',e={};
  if(!inicio.trim()&&!fin.trim())return e;
  const a=metrosEstacionamiento(inicio),z=metrosEstacionamiento(fin);
  if(a===null)e['estacionamiento-inicio']='Escribe el inicio en kilómetros, con hasta tres decimales. Ejemplo: 4,5.';
  if(z===null)e['estacionamiento-final']='Escribe el final en kilómetros, con hasta tres decimales. Ejemplo: 9,87.';
  if(a!==null&&z!==null&&z<a)e['estacionamiento-final']='El estacionamiento final debe ser igual o mayor que el inicial.';
  return e;
}
export function senasInicioDelReporte(b) {
  if(esAcarreo(b))return '';
  if(!(b.estacionamientoInicioTexto??'').trim()&&!(b.estacionamientoFinalTexto??'').trim())return '';
  return 'Estacionamiento '+(estacionamientoVisible(b.estacionamientoInicioTexto??'')||'__________')+
    ' al '+(estacionamientoVisible(b.estacionamientoFinalTexto??'')||'__________');
}
export function avanceDelReporte(b) {
  if(esAcarreo(b)||Object.keys(erroresEstacionamientos(b)).length)return null;
  const a=metrosEstacionamiento(b.estacionamientoInicioTexto??''),z=metrosEstacionamiento(b.estacionamientoFinalTexto??'');
  return a===null||z===null?null:(z-a)/1000;
}
export function estacionamientosAnteriores(texto) {
  const m=String(texto??'').match(/^\s*Estacionamiento\s+(\d+)\s*\+\s*(\d{3})\s+al\s+(\d+)\s*\+\s*(\d{3})\s*$/i);
  return m?{estacionamientoInicioTexto:m[1]+','+m[2],estacionamientoFinalTexto:m[3]+','+m[4]}:
    {estacionamientoInicioTexto:'',estacionamientoFinalTexto:''};
}
export function formulaAvanceExcel() {
  // Lee el texto visible D14, de modo que corregir las estaciones en Excel
  // también actualiza el avance. Los espacios y los tres metros son explícitos.
  const inicio='VALUE(SUBSTITUTE(SUBSTITUTE(LEFT(D14,FIND(" al ",D14)-1),"Estacionamiento ","")," + ",""))';
  const fin='VALUE(SUBSTITUTE(MID(D14,FIND(" al ",D14)+4,99)," + ",""))';
  return 'IF(OR(E13=533,E13="533",E13=534,E13="534"),"",IFERROR(IF('+fin+'>='+inicio+',ROUND(('+fin+'-'+inicio+')/1000,3),""),""))';
}
