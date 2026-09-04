const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const iterationDataPath = path.join(projectRoot, 'assets/js/data/project-iteration-records.js');
const annotationDataPath = path.join(projectRoot, 'assets/js/data/project-annotation-data.js');
const host = process.env.PROJECT_CODE_SAVE_HOST || '127.0.0.1';
const port = Number(process.env.PROJECT_CODE_SAVE_PORT || 4173);
const maxBodyBytes = 2 * 1024 * 1024;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readProjectData(filePath, globalName, fallback) {
  try {
    const source = fs.readFileSync(filePath, 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(source, sandbox, { filename: filePath });
    return sandbox.window[globalName] || clone(fallback);
  } catch (error) {
    console.warn(`[save-server] 读取 ${path.relative(projectRoot, filePath)} 失败，使用空数据：${error.message}`);
    return clone(fallback);
  }
}

function writeProjectData(filePath, globalName, value) {
  const source = `(function () {\n  window.${globalName} = ${JSON.stringify(value, null, 2)};\n})();\n`;
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, source, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  const localOrigin = !origin
    || origin === 'null'
    || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
  if (localOrigin) {
    response.setHeader('Access-Control-Allow-Origin', origin || '*');
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

function sendJson(request, response, statusCode, payload) {
  setCorsHeaders(request, response);
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(new Error('请求内容过大'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (error) {
        reject(new Error(`请求不是有效 JSON：${error.message}`));
      }
    });
    request.on('error', reject);
  });
}

function saveIterationData(payload) {
  if (!['records', 'platforms'].includes(payload.kind) || !Array.isArray(payload.value)) {
    throw new Error('迭代保存请求需要 kind(records/platforms) 和数组 value');
  }
  const data = readProjectData(iterationDataPath, 'ProjectIterationData', {
    schemaVersion: '20260904-1',
    platforms: [],
    records: []
  });
  data.schemaVersion ||= '20260904-1';
  data.platforms = Array.isArray(data.platforms) ? data.platforms : [];
  data.records = Array.isArray(data.records) ? data.records : [];
  data[payload.kind] = clone(payload.value);
  writeProjectData(iterationDataPath, 'ProjectIterationData', data);
  return data[payload.kind];
}

function saveAnnotationData(payload) {
  const pageKey = String(payload.pageKey || '').trim();
  const definition = payload.definition;
  if (!pageKey || pageKey.length > 500 || !definition || typeof definition !== 'object' || !definition.id) {
    throw new Error('标注保存请求缺少 pageKey 或 definition.id');
  }
  const data = readProjectData(annotationDataPath, 'PrototypeAnnotationData', {
    schemaVersion: '20260904-1',
    pages: {}
  });
  data.schemaVersion ||= '20260904-1';
  data.pages = data.pages && typeof data.pages === 'object' ? data.pages : {};
  const definitions = Array.isArray(data.pages[pageKey]) ? data.pages[pageKey] : [];
  const nextDefinition = clone(definition);
  const existingIndex = definitions.findIndex((item) => item?.id === nextDefinition.id);
  if (existingIndex >= 0) definitions[existingIndex] = nextDefinition;
  else definitions.push(nextDefinition);
  data.pages[pageKey] = definitions;
  writeProjectData(annotationDataPath, 'PrototypeAnnotationData', data);
  return nextDefinition;
}

function resolveStaticFile(pathname) {
  const decodedPath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  if (decodedPath.includes('\0')) return null;
  const target = path.resolve(projectRoot, `.${decodedPath}`);
  if (target !== projectRoot && !target.startsWith(`${projectRoot}${path.sep}`)) return null;
  return target;
}

function serveStatic(request, response, pathname) {
  const filePath = resolveStaticFile(pathname);
  if (!filePath) {
    sendJson(request, response, 403, { ok: false, error: '禁止访问该路径' });
    return;
  }
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (error) {
    sendJson(request, response, 404, { ok: false, error: '文件不存在' });
    return;
  }
  if (!stat.isFile()) {
    sendJson(request, response, 404, { ok: false, error: '不是可访问文件' });
    return;
  }
  setCorsHeaders(request, response);
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
  });
  fs.createReadStream(filePath).on('error', () => {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }).pipe(response);
}

const server = http.createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
  } catch (error) {
    sendJson(request, response, 400, { ok: false, error: '无效 URL' });
    return;
  }

  if (request.method === 'OPTIONS') {
    setCorsHeaders(request, response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'POST' && url.pathname === '/__iteration-code-save') {
    try {
      const payload = await readJsonBody(request);
      const value = saveIterationData(payload);
      sendJson(request, response, 200, { ok: true, kind: payload.kind, value });
    } catch (error) {
      sendJson(request, response, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/__annotation-code-save') {
    try {
      const payload = await readJsonBody(request);
      const definition = saveAnnotationData(payload);
      sendJson(request, response, 200, { ok: true, definition });
    } catch (error) {
      sendJson(request, response, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    serveStatic(request, response, url.pathname);
    return;
  }

  sendJson(request, response, 405, { ok: false, error: '不支持的请求方法' });
});

server.on('error', (error) => {
  console.error(`[save-server] 启动失败：${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`[save-server] 已启动：http://${host}:${port}`);
  console.log('[save-server] 支持项目静态页面、标注保存和迭代记录保存');
});
