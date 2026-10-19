import 'dart:io';

/// Servidor local de desarrollo. Utiliza Dart, incluido con Flutter.
/// La instalación en teléfonos requiere que el sitio esté servido por HTTPS.
Future<void> main(List<String> argumentos) async {
  final puerto = argumentos.isEmpty ? 8080 : int.parse(argumentos.first);
  final raiz = await Directory.fromUri(Platform.script.resolve('../'))
      .resolveSymbolicLinks();
  final prefijo = raiz.endsWith(Platform.pathSeparator)
      ? raiz
      : raiz + Platform.pathSeparator;
  final servidor = await HttpServer.bind(InternetAddress.loopbackIPv4, puerto);
  print('Abre http://localhost:$puerto en el navegador.');
  print('Para detener el servidor pulsa Ctrl+C.');
  final tipos = <String, String>{
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.otf': 'font/otf',
    '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  await for (final solicitud in servidor) {
    try {
      if (solicitud.method != 'GET' && solicitud.method != 'HEAD') {
        solicitud.response.statusCode = 405;
        await solicitud.response.close();
        continue;
      }
      var ruta = Uri.decodeComponent(solicitud.uri.path);
      if (ruta.endsWith('/')) ruta += 'index.html';
      final archivo = File(raiz + ruta);
      if (!await archivo.exists()) {
        solicitud.response.statusCode = 404;
      } else {
        final real = await archivo.resolveSymbolicLinks();
        if (!real.startsWith(prefijo)) {
          solicitud.response.statusCode = 403;
        } else {
          final punto = ruta.lastIndexOf('.');
          final extension = punto < 0 ? '' : ruta.substring(punto);
          solicitud.response.headers.set(
              'Content-Type', tipos[extension] ?? 'application/octet-stream');
          solicitud.response.headers.set('Cache-Control', 'no-cache');
          if (ruta.endsWith('/sw.js'))
            solicitud.response.headers.set('Service-Worker-Allowed', '/');
          if (solicitud.method == 'GET')
            await solicitud.response.addStream(archivo.openRead());
        }
      }
    } catch (_) {
      solicitud.response.statusCode = 500;
    }
    await solicitud.response.close();
  }
}
