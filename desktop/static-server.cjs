const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function isolationHeaders(type) {
  return {
    'Content-Type': type,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-cache',
  };
}

function insideRoot(root, candidate) {
  const resolved = path.resolve(candidate);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function resolveInside(rootDir, pathname) {
  const root = path.resolve(rootDir);
  let decoded = '/';
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const rel = decoded.replace(/^\/+/, '');
  const requested = path.resolve(root, rel);
  if (!insideRoot(root, requested)) return null;
  return requested;
}

function createStaticServer(rootDir) {
  const root = path.resolve(rootDir);

  return http.createServer((req, res) => {
    let pathname = '/';
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    } catch {
      res.writeHead(400, isolationHeaders('text/plain; charset=utf-8'));
      res.end('bad request');
      return;
    }

    const requested = resolveInside(root, pathname);
    if (!requested) {
      res.writeHead(403, isolationHeaders('text/plain; charset=utf-8'));
      res.end('forbidden');
      return;
    }

    const candidates = [];
    if (pathname === '/' || pathname.endsWith('/')) candidates.push(path.join(requested, 'index.html'));
    else {
      candidates.push(requested);
      candidates.push(`${requested}.html`);
      candidates.push(path.join(requested, 'index.html'));
    }

    for (const candidate of candidates) {
      if (!insideRoot(root, candidate)) continue;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const type = TYPES[path.extname(candidate).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, isolationHeaders(type));
        fs.createReadStream(candidate).pipe(res);
        return;
      }
    }

    const accept = String(req.headers.accept || '');
    const index = path.join(root, 'index.html');
    if ((accept.includes('text/html') || path.extname(requested) === '') && fs.existsSync(index)) {
      res.writeHead(200, isolationHeaders('text/html; charset=utf-8'));
      fs.createReadStream(index).pipe(res);
      return;
    }

    res.writeHead(404, isolationHeaders('text/plain; charset=utf-8'));
    res.end('not found');
  });
}

module.exports = { createStaticServer, resolveInside };
