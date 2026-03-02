import path from 'path';
import fs from 'fs/promises';

const DOCS_DIR = path.join(process.cwd(), 'docs-content');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

export async function GET(request, { params }) {
  const slug = (await params).slug ?? [];

  // Root /docs request — serve the Docsify entry point
  const relPath = slug.length === 0 ? 'index.html' : path.normalize(slug.join('/'));

  // Block path traversal attempts (e.g. ../../etc/passwd)
  if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
    return new Response('Not Found', { status: 404 });
  }

  const filePath = path.join(DOCS_DIR, relPath);

  // Double-check the resolved path stays inside DOCS_DIR
  if (!filePath.startsWith(DOCS_DIR + path.sep) && filePath !== DOCS_DIR) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const stat = await fs.stat(filePath);
    // Serve index.html for directory requests
    const actualPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const content = await fs.readFile(actualPath);
    const ext = path.extname(actualPath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': contentType },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}
