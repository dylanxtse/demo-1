const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

function loadBundle() {
  const bundlePath = path.join(__dirname, '..', 'dist', 'prototype-tools.js');
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  const body = { nodeType: 1 };
  const document = {
    currentScript: { src: 'https://example.test/tool/dist/prototype-tools.js' },
    baseURI: 'https://example.test/tool/dist/',
    scripts: [],
    body,
    head: { appendChild() {} },
    documentElement: { nodeType: 1 },
    createElement() { return { dataset: {}, addEventListener() {}, setAttribute() {} }; },
    querySelector() { return null; }
  };
  const context = {
    console,
    document,
    location: { href: document.baseURI, protocol: 'https:' },
    URL,
    Map,
    Set,
    WeakMap,
    Promise,
    Date,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Error,
    TypeError,
    parseInt,
    parseFloat,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(bundle, context, { filename: bundlePath });
  return { context, body };
}

test('standalone bundle exposes the toolkit and reuses mounted instances', async () => {
  const { context, body } = loadBundle();
  assert.equal(context.PrototypeTools.version, '0.2.1');

  const memory = context.PrototypeToolsStorage.createMemoryAdapter();
  memory.save({ kind: 'smoke' }, { ok: true });
  assert.deepEqual(memory.load({ kind: 'smoke' }), { ok: true });

  const instance = context.PrototypeTools.mount({ root: body, annotation: false, iteration: false });
  assert.equal(context.PrototypeTools.mount({ root: body, annotation: false, iteration: false }), instance);
  instance.destroy();
  assert.equal(body.__prototypeToolsInstance, undefined);

  assert.equal(await context.PrototypeTools.load(), context.PrototypeTools);
});

test('annotation placeholders preserve a base ID for instance-aware matching', () => {
  const { context } = loadBundle();
  const markup = context.AnnotationOverlay.renderPlaceholder(
    { id: 'annotation-1', target: 'custom' },
    'column',
    true,
  );

  assert.match(markup, /data-annotation-placeholder="annotation-1-column"/);
  assert.match(markup, /data-annotation-base="annotation-1"/);

  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'annotation-overlay.js'),
    'utf8',
  );
  assert.match(source, /findPlaceholderForDefinition/);
  assert.match(source, /candidate\.dataset\.annotationBase === id/);
});
