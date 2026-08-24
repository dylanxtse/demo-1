(function () {
  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  class LocalStorageRepository {
    constructor(store) {
      if (!store) throw new Error('统一数据仓库未加载');
      this.store = store;
      this.mode = 'local';
    }

    list(resource) {
      return this.store.get(resource);
    }

    get(resource, id) {
      return this.list(resource).find((record) =>
        record.id === id
        || record.orderId === id
        || record.code === id
      ) || null;
    }

    create(resource, data) {
      return this.store.transact((state) => {
        const key = resource === 'sortingItems' ? 'sortingTasks' : resource;
        if (!Array.isArray(state[key])) state[key] = [];
        const created = clone(data);
        state[key].unshift(created);
        return created;
      });
    }

    update(resource, id, data) {
      return this.store.transact((state) => {
        const key = resource === 'sortingItems' ? 'sortingTasks' : resource;
        const record = (state[key] || []).find((item) => item.id === id);
        if (!record) return null;
        Object.assign(record, clone(data), { id: record.id });
        return record;
      });
    }

    remove(resource, id) {
      return this.store.transact((state) => {
        const key = resource === 'sortingItems' ? 'sortingTasks' : resource;
        const index = (state[key] || []).findIndex((item) => item.id === id);
        if (index < 0) return null;
        return state[key].splice(index, 1)[0];
      });
    }

    transaction(mutator) {
      return this.store.transact(mutator);
    }

    transition(resource, id, action, payload = {}) {
      if (!window.OrderFlowService?.transition) {
        const error = new Error('业务流程服务未加载');
        error.code = 'FLOW_SERVICE_UNAVAILABLE';
        throw error;
      }
      return window.OrderFlowService.transition(resource, id, action, payload);
    }

    reset() {
      return this.store.reset();
    }

    export() {
      return this.store.export();
    }

    import(value) {
      return this.store.import(value);
    }
  }

  class HttpRepository {
    constructor(options = {}) {
      this.baseUrl = String(options.baseUrl || '/api/v1').replace(/\/$/, '');
      this.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      this.mode = 'http';
    }

    async request(path, options = {}) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: { ...this.headers, ...(options.headers || {}) }
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        const error = new Error(detail.message || `请求失败（${response.status}）`);
        error.code = detail.code || 'HTTP_REPOSITORY_ERROR';
        error.status = response.status;
        throw error;
      }
      return response.status === 204 ? null : response.json();
    }

    list(resource, query = {}) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== '' && value != null) params.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
      });
      const suffix = params.toString() ? `?${params}` : '';
      return this.request(`/${encodeURIComponent(resource)}${suffix}`);
    }

    get(resource, id) {
      return this.request(`/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`);
    }

    create(resource, data) {
      return this.request(`/${encodeURIComponent(resource)}`, { method: 'POST', body: JSON.stringify(data) });
    }

    update(resource, id, data) {
      return this.request(`/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
    }

    remove(resource, id) {
      return this.request(`/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    transition(resource, id, action, payload = {}) {
      return this.request(`/${encodeURIComponent(resource)}/${encodeURIComponent(id)}/actions/${encodeURIComponent(action)}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  }

  const localRepository = new LocalStorageRepository(window.DemoStore);
  window.Repository = {
    LocalStorageRepository,
    HttpRepository,
    current: localRepository,
    use(repository) {
      if (!repository) throw new Error('数据仓库不能为空');
      this.current = repository;
      return repository;
    }
  };
  window.AppRepository = localRepository;
})();
