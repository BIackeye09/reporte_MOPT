import {fechaVisible,decimal,FILAS_PERSONAL,FILAS_EQUIPOS,FILAS_MATERIALES,FILAS_OBSERVACIONES,lineasObservaciones,PART_MOPT,horasDePersonal,totalHoras,horasDeEquipo,totalHorasEquipo,partEquipo,numeroReporteVisible,produccionDelReporte,unidadProduccion,filaUltimaLinea} from './core.mjs';
import {esAcarreo,filasAcarreos,FILAS_ACARREOS,codigoParticipante,enteroAcarreo,subtotalAcarreo,lineasAcarreo,capacidadVisible} from './acarreos-reglas.mjs';
// Coordenadas en puntos de la hoja carta original. Sólo se dibujan los datos.
// El membrete, los bordes y las tablas son el fondo obtenido del XLS recibido.
export function dibujarFrente(ctx,fondo,b,catalogos,escala=4) {
  ctx.save();ctx.setTransform(escala,0,0,escala,0,0);
  ctx.clearRect(0,0,612,792);ctx.drawImage(fondo,0,0,612,792);
  ctx.fillStyle='#000';ctx.textBaseline='middle';
  const c=catalogos.caminos.get(b.codigoCamino), a=catalogos.actividades.get(b.codigoActividad);
  function texto(t,x,y,ancho,tamano=6.5,negrita=true,alineacion='center',base='middle') {
    if (!t) return;
    ctx.font=`${negrita?'bold ':''}${tamano}px Reporte, Arial, sans-serif`;
    ctx.textAlign=alineacion;ctx.save();ctx.textBaseline=base;ctx.beginPath();
    const izquierda=alineacion==='left'?x:alineacion==='right'?x-ancho:x-ancho/2;
    ctx.rect(izquierda,y-(base==='alphabetic'?12:7),ancho,base==='alphabetic'?15:14);ctx.clip();
    // Canvas ajusta únicamente textos que superarían el ancho de su casilla.
    ctx.fillText(String(t),x,y,ancho);ctx.restore();
  }
  texto(c?.codigo,196.48,117,56,10.807);
  texto(c?.desde,327.36,105.4,164);
  texto(c?.hasta,325.74,128.8,164,5.893);
  texto(a?.codigo,125.97,146.4,27);
  texto(a?.descripcion,287.89,147.7,241);
  // Número de reporte está en el membrete, por encima de la casilla Boleta.
  texto(numeroReporteVisible(b.numeroReporteTexto??''),521,68.5,76,8.603);
  if(fechaVisible(b.fecha)) {
    const [d,m,ano]=fechaVisible(b.fecha).split('/');
    texto(d,492.89,116.9,19,5.893);texto(m,512.13,116.9,17,5.893);texto(ano,540.31,116.9,37,5.893);
  }
  if(a)texto(unidadProduccion(b,catalogos),521.895,132.1,37,7.608,true,'left');
  const produccion=produccionDelReporte(b);
  if(produccion!==null)texto(esAcarreo(b)?produccion.toFixed(2).replace('.',','):produccion.toFixed(2),519.59,132.1,37,8.603,true,'right');
  // Estos campos empiezan vacíos. No reciben información del catálogo del camino.
  if(b.senasInicio.trim())texto(b.senasInicio.trim(),78.31,164.7,333,8.097,false,'left');
  if(decimal(b.longitudTexto)!==null)texto(b.longitudTexto.trim().replace(',','.'),511.93,175.8,125,7.608);
  texto(b.problema,540.3,146.5,36,7.608);
  // Las filas conservan la altura y las columnas del reporte impreso original.
  // Se dibuja el nombre completo del catálogo, ajustado al ancho disponible.
  for(const [i,id] of (b.personal??[]).entries()) {
    const persona=catalogos.personal.get(id),fila=FILAS_PERSONAL[i];
    if(!persona||fila===undefined)continue;
    const y=245.725+(fila-22)*16.2;
    texto(PART_MOPT,26.022,y+.199,35,7.608,true,'left','alphabetic');
    texto(persona.codigo,86.249,y,42,8.603,true,'center','alphabetic');
    texto(persona.cedula,110.762,y,54,8.603,true,'left','alphabetic');
    texto(persona.nombre,168.087,y,108,8.603,true,'left','alphabetic');
  }
  const bordesFilas=[231.75,247.875,264.125,280.25,296.5,312.75,328.875,345.125,361.25,377.5,393.75,409.875,426.125];
  const bordesHoras=[280,301,318.875,336.875,353.5,368.5,383.375,408.25];
  for(const [i,id] of (b.personal??[]).entries()) {
    const fila=FILAS_PERSONAL[i];if(fila===undefined)continue;
    const h=horasDePersonal(b,id),valores=[decimal(h.ordinarias),decimal(h.extras),h.pagoExtras.trim(),
      decimal(h.traslado),decimal(h.noTrabajadas),h.justificacion.trim(),totalHoras(h)];
    const arriba=bordesFilas[fila-22],abajo=bordesFilas[fila-21];
    valores.forEach((valor,n)=>{
      ctx.save();ctx.fillStyle=n===6?'#333300':'#000';
      textoCelda(valor,bordesHoras[n],bordesHoras[n+1],arriba,abajo,'center',8.603);ctx.restore();
    });
  }
  for(const [i,entrada] of (b.equipos??[]).entries()) {
    const equipo=catalogos.equipos.get(entrada.id),fila=FILAS_EQUIPOS[i];
    if(!equipo||fila===undefined)continue;
    const y=245.924+(fila-22)*16.2;
    texto(partEquipo(b,entrada.id),412.373,y,32,7.608,true,'left','alphabetic');
    texto(equipo.codigoEquipo,453.542,y,23,7.608,true,'center','alphabetic');
    texto(equipo.numeroEquipo,485.195,y,25,7.608,true,'center','alphabetic');
    const h=horasDeEquipo(b,entrada.id),valores=[decimal(h.trabajadas),decimal(h.traslado),totalHorasEquipo(h)];
    const limites=[503.5,534.625,559.875,583.375],arriba=bordesFilas[fila-22],abajo=bordesFilas[fila-21];
    valores.forEach((valor,n)=>textoCelda(valor===null?null:String(valor).replace('.',','),limites[n],limites[n+1],arriba,abajo,'center',7.608));
  }
  function cerrarTabla(tipo,izquierda,derecha) {
    // Una vista de un borrador antiguo puede contener once registros. Se
    // conserva su texto y el formulario pide reducirlos antes de descargar.
    if((b[tipo]?.length??0)>10)return;
    const fila=filaUltimaLinea(tipo,b[tipo]?.length??0),arriba=bordesFilas[fila-22],abajo=bordesFilas[fila-21];
    ctx.save();ctx.fillStyle='#fff';
    // Se retiran sólo los separadores interiores de esta fila. Los bordes
    // externos, las otras filas y la simbología conservan el fondo original.
    ctx.fillRect(izquierda+.8,arriba+.8,derecha-izquierda-1.6,abajo-arriba-1.6);
    ctx.fillStyle='#000';texto('Última línea',(izquierda+derecha)/2,(arriba+abajo)/2,derecha-izquierda-2,7.608,true);
    ctx.restore();
  }
  cerrarTabla('personal',25.375,408.25);cerrarTabla('equipos',411.125,583.375);
  // Bordes medidos en el fondo original, en puntos de la página carta.
  // Cada texto se ajusta y recorta dentro de su propia celda, también en la
  // última fila, para conservar observaciones, firmas y simbología intactas.
  const limitesY=[479.25,492.625,506.75,520.75,534.875,549,563,577.125,591.25];
  function textoCelda(valor,izquierda,derecha,arriba,abajo,alineacion='center',tamano=7.608) {
    if(valor===null||valor===undefined||valor==='')return;
    ctx.save();ctx.font=`${tamano}px Reporte, Arial, sans-serif`;
    ctx.textBaseline='middle';ctx.textAlign=alineacion;ctx.beginPath();
    ctx.rect(izquierda+1,arriba+1,derecha-izquierda-2,abajo-arriba-2);ctx.clip();
    const x=alineacion==='left'?izquierda+1.5:alineacion==='right'?derecha-1.5:(izquierda+derecha)/2;
    ctx.fillText(String(valor),x,(arriba+abajo)/2,derecha-izquierda-3);ctx.restore();
  }
  for(const [i,entrada] of (b.materiales??[]).entries()) {
    const material=catalogos.materiales.get(entrada.codigo);
    if(!material||i>=FILAS_MATERIALES.length)continue;
    const arriba=limitesY[i],abajo=limitesY[i+1];
    textoCelda(PART_MOPT,25.25,62.125,arriba,abajo);
    textoCelda(material.codigo,62.125,110,arriba,abajo);
    textoCelda(material.descripcion,110,243.25,arriba,abajo,'left');
    textoCelda(material.unidad,243.25,261.25,arriba,abajo);
    // Se conserva la diferencia entre cantidad vacía y cero.
    textoCelda(decimal(entrada.cantidadTexto),261.25,301,arriba,abajo,'right');
  }
  // Las observaciones usan las mismas tres líneas que el Excel. El cuadro
  // queda por encima de las firmas y se conserva su tamaño original.
  ctx.save();ctx.beginPath();ctx.rect(336.5,466.5,224,41);ctx.clip();
  const basesObservaciones=[477.25,490.5,504.75];
  for(const [i,linea] of lineasObservaciones(b.observaciones??'').slice(0,FILAS_OBSERVACIONES.length).entries())
    texto(linea,337,basesObservaciones[i],222,7.608,false,'left','alphabetic');
  ctx.restore();
  ctx.restore();
}
export function dibujarReverso(ctx,fondo,b,catalogos,escala=4) {
  ctx.save();ctx.setTransform(escala,0,0,escala,0,0);ctx.clearRect(0,0,612,792);
  // Sin fondo se dibujan sólo los datos, sobre transparencia, para el PDF.
  if(fondo)ctx.drawImage(fondo,0,0,612,792);
  if(b&&esAcarreo(b)) {
    // Puntos medidos en RDA RN 507, 11-08 130.pdf, recibido el 14/10/2026.
    // Cada grupo tiene nueve filas; la última marca termina antes de TOTAL.
    const bordes=[31.62,54.06,106.64,152.84,215.99,263.99,300.11,321.61,343.09,364.57,386.05,407.53,429.01,450.52,468.88,487.24,505.60,523.96,542.32,578.452];
    const alturas={
      mopt:[96.80,116.48,136.16,155.84,175.52,195.20,214.88,234.56,254.27,273.95],
      alquilado:[317.99,337.67,357.35,377.03,396.71,416.41,436.09,455.77,475.45,495.13],
      otros:[563.89,583.60,603.28,622.96,642.64,662.32,682.00,701.676,721.356,741.036]
    };
    function celda(valor,col,arriba,abajo,tamano=8.097) {
      if(valor===null||valor===undefined||valor==='')return;
      const izquierda=bordes[col],derecha=bordes[col+1],lineas=Array.isArray(valor)?valor:[String(valor)];
      ctx.save();ctx.beginPath();ctx.rect(izquierda+1,arriba+1,derecha-izquierda-2,abajo-arriba-2);ctx.clip();
      ctx.fillStyle='#000';ctx.font=tamano+'px Reporte, Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      lineas.forEach((t,i)=>ctx.fillText(t,(izquierda+derecha)/2,(arriba+abajo)/2+(i-(lineas.length-1)/2)*6,derecha-izquierda-3));ctx.restore();
    }
    for(const {id,registro:r,fila,grupo} of filasAcarreos(b)) {
      const equipo=catalogos.equipos.get(id),i=FILAS_ACARREOS[grupo].indexOf(fila);
      if(!equipo||i<0)continue;
      const arriba=alturas[grupo][i],abajo=alturas[grupo][i+1];
      celda(codigoParticipante(r),0,arriba,abajo);celda(equipo.codigoEquipo+'-'+equipo.numeroEquipo,1,arriba,abajo);
      celda(capacidadVisible(r.capacidadTexto),2,arriba,abajo);
      celda(lineasAcarreo(r.fuente,21).slice(0,3),3,arriba,abajo,5.5);celda(lineasAcarreo(r.material,16).slice(0,3),4,arriba,abajo,5.5);
      celda(enteroAcarreo(r.longitudTexto),5,arriba,abajo);
      r.viajes.forEach((v,n)=>{if(v)celda('X',6+n,arriba,abajo,7.608);});
      const total=subtotalAcarreo(r);celda(total===null?null:total.toFixed(2).replace('.',','),18,arriba,abajo);
    }
  }
  ctx.restore();
}
