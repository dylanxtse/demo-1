/*
 * Prototype Tools storage adapters.
 *
 * Feature modules only depend on load/save/remove. The host project decides
 * whether data lives in memory, localStorage, an API, or source-code service.
 */
(function (global) {
  const clone = (value) => {
    if (value === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  };

  const scopeKey = (scope) => typeof scope === 'string'
    ? scope
    : JSON.stringify(scope || {});

  function createMemoryAdapter(initial = {}) {
    const values = new Map();
    if (initial instanceof Map) {
      initial.forEach((value, key) => values.set(String(key), clone(value)));
    } else if (initial && typeof initial === 'object') {
      Object.entries(initial).forEach(([key, value]) => values.set(key, clone(value)));
    }
    return {
      load: (scope) => clone(values.get(scopeKey(scope))),
      save: (scope, value) => {
        values.set(scopeKey(scope), clone(value));
        return clone(value);
      },
      remove: (scope) => values.delete(scopeKey(scope)),
      clear: () => values.clear()
    };
  }

  function getBrowserStorage(storage) {
    if (storage) return storage;
    try {
      return global.localStorage;
    } catch (error) {
      return null;
    }
  }

  function createLocalStorageAdapter({
    key = 'prototype-tools-storage-v1',
    storage
  } = {}) {
    const browserStorage = getBrowserStorage(storage);
    const read = () => {
      if (!browserStorage) return {};
      try {
        const parsed = JSON.parse(browserStorage.getItem(key) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (error) {
        return {};
      }
    };
    const write = (values) => {
      if (!browserStorage) return;
      try {
        browserStorage.setItem(key, JSON.stringify(values));
      } catch (error) {
        // 隐私模式或 file:// 环境禁用存储时，由宿主自行处理降级。
      }
    };
    return {
      load(scope) {
        return clone(read()[scopeKey(scope)]);
      },
      save(scope, value) {
        const values = read();
        values[scopeKey(scope)] = clone(value);
        write(values);
        return clone(value);
      },
      remove(scope) {
        const values = read();
        const keyToRemove = scopeKey(scope);
        const existed = Object.prototype.hasOwnProperty.call(values, keyToRemove);
        delete values[keyToRemove];
        write(values);
        return existed;
      }
    };
  }

  function createCallbackAdapter({ load, save, remove } = {}) {
    return {
      load: (...args) => typeof load === 'function' ? load(...args) : undefined,
      save: (...args) => typeof save === 'function' ? save(...args) : undefined,
      remove: (...args) => typeof remove === 'function' ? remove(...args) : undefined
    };
  }

  function createFetchAdapter({ endpoint, fetchImpl = global.fetch?.bind(global), headers = {} } = {}) {
    if (!endpoint || typeof fetchImpl !== 'function') {
      throw new Error('PrototypeToolsStorage.createFetchAdapter 需要 endpoint 和 fetch');
    }
    const resolveEndpoint = (scope) => typeof endpoint === 'function' ? endpoint(scope) : endpoint;
    const parseResponse = async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return payload?.value ?? payload?.data ?? payload;
    };
    return {
      async load(scope) {
        const url = new URL(resolveEndpoint(scope), global.location?.href || 'http://localhost/');
        url.searchParams.set('scope', JSON.stringify(scope || {}));
        return parseResponse(await fetchImpl(url, { headers }));
      },
      async save(scope, value) {
        return parseResponse(await fetchImpl(resolveEndpoint(scope), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ scope, value })
        }));
      },
      async remove(scope) {
        return parseResponse(await fetchImpl(resolveEndpoint(scope), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ scope })
        }));
      }
    };
  }

  global.PrototypeToolsStorage = {
    scopeKey,
    createMemoryAdapter,
    createLocalStorageAdapter,
    createCallbackAdapter,
    createFetchAdapter
  };
})(typeof window === 'undefined' ? globalThis : window);
