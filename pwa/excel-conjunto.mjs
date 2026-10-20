import {erroresConjunto} from './continuacion.mjs';
import {generarArchivosExcel,zipGuardado,utf8} from './core.mjs';

const texto=bytes=>new TextDecoder().decode(bytes);
// Se reutilizan las hojas originales, sus dimensiones, impresión y dibujos.
// Los estilos añadidos en cada reporte permanecen en una sola tabla acumulada.
export function generarExcelConjunto(plantilla,reportes,catalogos) {
  if(!reportes.length)throw new Error('No hay reportes para exportar.');
  const revision=erroresConjunto({reportes},catalogos).find(e=>Object.keys(e).length);
  if(revision)throw new Error('Revisa el encabezado y los registros: '+Object.values(revision)[0]);
  let estilos=null,base;const hojas=[],relaciones=[],dibujos=[],nombres=[],areas=[];
  for(const [i,b] of reportes.entries()) {
    const archivos=generarArchivosExcel(plantilla,b,catalogos,estilos);
    base=archivos;estilos=archivos.find(f=>f.nombre==='xl/styles.xml').bytes;
    const frente=reportes.length===1?'FrenteRDA':'FrenteRDA_'+(i+1),atras=reportes.length===1?'AtrásRDA':'AtrásRDA_'+(i+1);
    for(const [cara,nombre] of [[1,frente],[2,atras]]) {
      const numero=2*i+cara,ruta='xl/worksheets/sheet'+numero+'.xml';
      let xml=texto(archivos.find(f=>f.nombre==='xl/worksheets/sheet'+cara+'.xml').bytes);
      // Sólo cambian los destinos de las fórmulas; cada producción suma su
      // propio reverso y no los viajes pertenecientes a otra continuación.
      xml=xml.replaceAll("'FrenteRDA'!","'"+frente+"'!").replaceAll("'AtrásRDA'!","'"+atras+"'!").replaceAll("&apos;FrenteRDA&apos;!","&apos;"+frente+"&apos;!").replaceAll("&apos;AtrásRDA&apos;!","&apos;"+atras+"&apos;!");
      hojas.push({nombre:ruta,bytes:utf8(xml)});
      nombres.push('<sheet name="'+nombre+'" sheetId="'+numero+'" r:id="reporte'+numero+'"/>');
      areas.push('<definedName name="_xlnm.Print_Area" localSheetId="'+(numero-1)+'">\''+nombre+'\'!'+(cara===1?'$B$1:$AH$64':'$A$1:$S$45')+'</definedName>');
      if(cara===1) {
        const rel=archivos.find(f=>f.nombre==='xl/worksheets/_rels/sheet1.xml.rels');
        relaciones.push({nombre:'xl/worksheets/_rels/sheet'+numero+'.xml.rels',bytes:utf8(texto(rel.bytes).replaceAll('drawing1.xml','drawing'+(i+1)+'.xml'))});
      }
    }
    for(const [origen,destino] of [['xl/drawings/drawing1.xml','xl/drawings/drawing'+(i+1)+'.xml'],['xl/drawings/_rels/drawing1.xml.rels','xl/drawings/_rels/drawing'+(i+1)+'.xml.rels']])
      dibujos.push({nombre:destino,bytes:archivos.find(f=>f.nombre===origen).bytes});
  }
  const archivos=base.filter(f=>!/^xl\/(worksheets\/|drawings\/)/.test(f.nombre));
  const workbook=archivos.find(f=>f.nombre==='xl/workbook.xml');
  workbook.bytes=utf8(texto(workbook.bytes).replace(/<sheets>[\s\S]*?<\/sheets>/,'<sheets>'+nombres.join('')+'</sheets>').replace(/<definedNames>[\s\S]*?<\/definedNames>/,'<definedNames>'+areas.join('')+'</definedNames>'));
  const rel=archivos.find(f=>f.nombre==='xl/_rels/workbook.xml.rels');
  let xml=texto(rel.bytes).replace(/<Relationship\b[^>]*Type="[^"]*\/worksheet"[^>]*\/>/g,'');
  xml=xml.replace('</Relationships>',hojas.map((_,i)=>'<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet'+(i+1)+'.xml" Id="reporte'+(i+1)+'"/>').join('')+'</Relationships>');rel.bytes=utf8(xml);
  const tipos=archivos.find(f=>f.nombre==='[Content_Types].xml');
  xml=texto(tipos.bytes).replace(/<Override\b[^>]*PartName="\/xl\/(worksheets|drawings)\/[^\"]+"[^>]*\/>/g,'');
  xml=xml.replace('</Types>',[...hojas,...dibujos.filter(f=>!f.nombre.includes('/_rels/'))].map(f=>'<Override PartName="/'+f.nombre+'" ContentType="application/vnd.openxmlformats-officedocument.'+(f.nombre.includes('/worksheets/')?'spreadsheetml.worksheet':'drawing')+'+xml"/>').join('')+'</Types>');tipos.bytes=utf8(xml);
  return zipGuardado([...archivos,...hojas,...relaciones,...dibujos]);
}
