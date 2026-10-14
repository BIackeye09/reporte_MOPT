import {PDFDocument} from './vendor/pdf-lib.min.mjs';

// El reverso se copia del PDF recibido. Sus fuentes, trazos y títulos no se
// reconstruyen ni se convierten a una fotografía dentro del PDF exportado.
// Los datos del acarreo se añaden como una capa PNG con fondo transparente.
export async function generarPdfConPlantilla(frentePng,reversoOriginal,datosReversoPng=null) {
  const original=await PDFDocument.load(reversoOriginal,{updateMetadata:false});
  if(original.getPageCount()!==1)throw new Error('La plantilla del reverso debe contener una página.');
  const paginaOriginal=original.getPage(0),{width,height}=paginaOriginal.getSize();
  if(width!==612||height!==792)throw new Error('La plantilla del reverso debe conservar su tamaño carta.');

  const documento=await PDFDocument.create();
  // El frente conserva la vista completada, sin la compresión JPEG anterior.
  const frente=await documento.embedPng(frentePng);
  documento.addPage([612,792]).drawImage(frente,{x:0,y:0,width:612,height:792});
  const [reverso]=await documento.copyPages(original,[0]);
  documento.addPage(reverso);
  if(datosReversoPng) {
    const datos=await documento.embedPng(datosReversoPng);
    reverso.drawImage(datos,{x:0,y:0,width:612,height:792});
  }
  documento.setTitle('Reporte diario de actividad');
  documento.setCreator('Reporte diario MOPT · PWA');
  return documento.save();
}
