import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const port = Number(process.env.ATLAS_TEST_PORT || 4173);
const distDirectory = fileURLToPath(new URL('../../dist/', import.meta.url));
const distPrefix = `${resolve(distDirectory)}${sep}`;
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.geojson', 'application/geo+json; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
    const pathname =
      requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
    const filename = resolve(distDirectory, `.${decodeURIComponent(pathname)}`);

    if (!filename.startsWith(distPrefix) || !(await stat(filename)).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }

    const body = await readFile(filename);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type':
        contentTypes.get(extname(filename)) || 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.listen(port, host);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
