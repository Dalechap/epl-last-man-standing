import fs from 'fs';
import http from 'http';
import path from 'path';
import { pathToFileURL } from 'url';

const root = process.cwd();
const port = Number(process.env.PORT || 3000);

// Read .env before the database client is imported.
function loadEnv() {
  const file = path.join(root, '.env');

  if (!fs.existsSync(file)) {
    return;
  }

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const splitAt = trimmed.indexOf('=');

    if (splitAt < 1) {
      continue;
    }

    const key = trimmed.slice(0, splitAt).trim();
    let value = trimmed.slice(splitAt + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const { sql, usingLocalDatabase } = await import('./lib/db.js');

// Create local tables the first time the dev server starts.
async function ensureSchema() {
  if (!usingLocalDatabase) {
    return;
  }

  const schema = fs.readFileSync(
    path.join(root, 'db/schema.sql'),
    'utf8'
  );

  await sql.unsafe(schema);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');

      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function vercelRes(res) {
  const wrapped = {
    status(code) {
      wrapped.statusCode = code;
      return wrapped;
    },
    json(body) {
      sendJson(res, wrapped.statusCode || 200, body);
    }
  };

  return wrapped;
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp'
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const type = contentTypes[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);

  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice('/api/'.length).replace(/\/+$/, '');

    if (!/^[a-z0-9-]+$/.test(name)) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const file = path.join(root, 'api', `${name}.js`);

    if (!fs.existsSync(file)) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const mod = await import(pathToFileURL(file).href);
    const query = Object.fromEntries(url.searchParams.entries());
    const body = req.method === 'GET' ? {} : await readBody(req);

    req.query = query;
    req.body = body;

    await mod.default(req, vercelRes(res));
    return;
  }

  let filePath = path.normalize(path.join(root, url.pathname));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (url.pathname === '/') {
    filePath = path.join(root, 'index.html');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (
    filePath.includes(`${path.sep}.env`) ||
    filePath.includes(`${path.sep}.git${path.sep}`) ||
    filePath.includes(`${path.sep}node_modules${path.sep}`)
  ) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  sendFile(res, filePath);
});

await ensureSchema();

server.listen(port, '127.0.0.1', () => {
  console.log(`Local app: http://127.0.0.1:${port}`);
});
