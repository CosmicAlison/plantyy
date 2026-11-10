import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
try { process.loadEnvFile('.env'); } catch {}
const root = process.cwd();
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const staticFiles = new Set(['/', '/index.html', '/style.css', '/app.js', '/flower.js', '/features.js']);
http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (pathname === '/api/scan' || pathname === '/api/chat') {
      const mod = await import(`./api/${pathname.slice(5)}.js`);
      await mod.default(req, res);
      return;
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (!staticFiles.has(pathname) && !pathname.startsWith('/assets/')) { res.writeHead(404).end('Not found'); return; }
    const body = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'}).end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(5173,'127.0.0.1',()=>console.log('Forget Me Nots is ready at http://127.0.0.1:5173'));
