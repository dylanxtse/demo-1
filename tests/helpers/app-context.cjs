const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

function createStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries));
  return {
    values,
    storage: {
      get length() { return values.size; },
      key(index) { return [...values.keys()][index] ?? null; },
      getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
      setItem(key, value) { values.set(String(key), String(value)); },
      removeItem(key) { values.delete(String(key)); },
      clear() { values.clear(); }
    }
  };
}

function loadApp(options = {}) {
  const { values, storage } = createStorage(options.storage || {});
  const context = {
    console,
    localStorage: storage,
    sessionStorage: storage,
    Date,
    Math,
    JSON,
    Map,
    Set,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    fetch: async () => { throw new Error('HTTP repository is not used in local tests'); }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);

  const scripts = [
    'assets/js/utils/business-rules.js',
    'assets/js/utils/storage.js',
    'assets/js/services/repository.js',
    'assets/js/data/mock-dataset.js',
    ...(options.services || [])
  ];
  scripts.forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  });
  return { context, values };
}

module.exports = { root, loadApp };
