import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, expect, afterEach } from 'vitest';

const require = createRequire(import.meta.url);
const { createStaticServer, resolveInside } = require('../desktop/static-server.cjs');

let server;
let root;

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = undefined;
  }
  if (root) {
    await rm(root, { recursive: true, force: true });
    root = undefined;
  }
});

async function listen(dir) {
  server = createStaticServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

test('desktop static server serves files, spa routes, and rejects traversal', async () => {
  root = await mkdtemp(path.join(tmpdir(), 'veribench-'));
  await writeFile(path.join(root, 'index.html'), '<!doctype html><title>VeriBench</title>');
  await mkdir(path.join(root, 'lesson'), { recursive: true });
  await writeFile(path.join(root, 'lesson', 'intro.html'), 'lesson-intro');
  await writeFile(path.join(root, 'tool.wasm'), Buffer.from([0, 97, 115, 109]));
  await writeFile(path.join(root, '..', 'secret.txt'), 'nope');

  const port = await listen(root);
  const base = `http://127.0.0.1:${port}`;

  const home = await fetch(base + '/');
  expect(await home.text()).toContain('VeriBench');
  expect(home.headers.get('cross-origin-embedder-policy')).toBe('require-corp');
  expect(home.headers.get('cross-origin-opener-policy')).toBe('same-origin');

  const lesson = await fetch(base + '/lesson/intro');
  expect(await lesson.text()).toBe('lesson-intro');

  const wasm = await fetch(base + '/tool.wasm');
  expect(wasm.headers.get('content-type')).toBe('application/wasm');

  const spa = await fetch(base + '/lesson/missing', { headers: { accept: 'text/html' } });
  expect(await spa.text()).toContain('VeriBench');

  const escaped = await fetch(base + '/../secret.txt');
  expect(escaped.status).not.toBe(200);
  expect(await escaped.text()).not.toContain('nope');
  expect(resolveInside(root, '/../secret.txt')).toBeNull();
});
