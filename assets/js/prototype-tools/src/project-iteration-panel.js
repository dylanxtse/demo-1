(function () {
  let mountedRoot = null;
  const storageKey = 'demo-project-iteration-records-v2';
  const platformStorageKey = 'demo-project-iteration-platforms-v1';
  const defaultRecordRetentionDays = 7;
  const deleteConfirmationWindowMs = 3000;
  const platformCatalog = [
    { name: '企业端', variants: ['enterprise'], tokens: ['企业端', '企业版企业端'] },
    { name: '供应商端', variants: ['supplier'], tokens: ['供应商端'] },
    { name: '教育局端', variants: ['education'], tokens: ['教育局端'] },
    { name: '学校端', variants: ['school'], tokens: ['学校端'] },
    { name: '运维管理平台', variants: ['operations'], tokens: ['运维管理平台'] }
  ];

  function resolveReadOnly(options = {}) {
    if (typeof options.readOnly === 'boolean') return options.readOnly;
    if (typeof window.PrototypeToolsConfig?.readOnly === 'boolean') {
      return window.PrototypeToolsConfig.readOnly;
    }
    const protocol = window.location?.protocol || '';
    const hostname = window.location?.hostname || '';
    const isLocal = protocol === 'file:'
      || hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '::1';
    return /^(http:|https:)$/.test(protocol) && !isLocal;
  }

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const stripDescriptionNumbering = (value) => String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\s*[、.．)]\s*/, ''))
    .join('\n');

  const hasDescriptionContent = (value) => stripDescriptionNumbering(value).trim().length > 0;

  const getDescriptionInputValue = (value) => {
    const text = String(value ?? '');
    return text.trim() ? text : '1. ';
  };

  const getNextDescriptionNumber = (value) => {
    const numbers = [...String(value || '').matchAll(/^\s*(\d+)\s*[、.．)]/gm)]
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);
    return (numbers.length ? Math.max(...numbers) : 0) + 1;
  };

  const closeIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18"></path>
    </svg>`;

  const gearIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m19.2 13.4 1.1.9-1.8 3.1-1.4-.5a7.8 7.8 0 0 1-1.5.9l-.2 1.5H12l-.2-1.5a7.8 7.8 0 0 1-1.5-.9l-1.4.5-1.8-3.1 1.1-.9a7.7 7.7 0 0 1 0-1.8l-1.1-.9 1.8-3.1 1.4.5a7.8 7.8 0 0 1 1.5-.9L12 5.7h3.5l.2 1.5a7.8 7.8 0 0 1 1.5.9l1.4-.5 1.8 3.1-1.1.9a7.7 7.7 0 0 1-.1 1.8Z"></path>
      <circle cx="13.75" cy="12.5" r="2.2"></circle>
    </svg>`;

  const arrowUpIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5"></path>
      <path d="m6 11 6-6 6 6"></path>
    </svg>`;

  const trashIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16"></path>
      <path d="M9 7V4h6v3"></path>
      <path d="m6 7 1 13h10l1-13"></path>
      <path d="M10 11v5M14 11v5"></path>
    </svg>`;

  const chevronDownIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6"></path>
    </svg>`;

  const chevronUpIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 15 6-6 6 6"></path>
    </svg>`;

  const cloneChanges = (changes) => (Array.isArray(changes) ? changes : []).map((change) => ({
    platform: change.platform,
    items: (Array.isArray(change.items) ? change.items : []).map((item) => ({
      feature: item.feature,
      description: item.description
    }))
  }));

  const cloneRecord = (record) => {
    const clone = {
      id: record.id,
      sequence: record.sequence,
      name: record.name,
      date: record.date,
      changes: cloneChanges(record.changes)
    };
    if (record.deletedAt) {
      clone.deletedAt = record.deletedAt;
      clone.deleteExpiresAt = record.deleteExpiresAt;
    }
    return clone;
  };

  const hashString = (value) => {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  const createLegacyRecordId = (source, index) => {
    const fingerprint = JSON.stringify({
      name: source?.name || source?.version || '',
      date: source?.date || '',
      changes: source?.changes || source?.items || source?.description || '',
      index
    });
    return `iteration-${hashString(fingerprint)}`;
  };

  const createNewRecordId = () => `iteration-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const getRecordRetentionDays = (options = {}) => {
    const value = Number(options.recordRetentionDays ?? options.recycleBinRetentionDays);
    return Number.isFinite(value) && value > 0 ? value : defaultRecordRetentionDays;
  };

  const isRecordDeleted = (record) => Boolean(record?.deletedAt);

  const isRecordExpired = (record, now = Date.now()) => {
    if (!isRecordDeleted(record)) return false;
    const expiresAt = Date.parse(record.deleteExpiresAt || '');
    return Number.isFinite(expiresAt) && expiresAt <= now;
  };

  const getActiveRecords = (records) => (Array.isArray(records) ? records : [])
    .filter((record) => !isRecordDeleted(record));

  const getTrashRecords = (records, now = Date.now()) => (Array.isArray(records) ? records : [])
    .filter((record) => isRecordDeleted(record) && !isRecordExpired(record, now));

  const pruneExpiredRecords = (records, now = Date.now()) => (Array.isArray(records) ? records : [])
    .filter((record) => !isRecordExpired(record, now));

  const normalisePlatformName = (value) => String(value ?? '').trim();

  const normalisePlatforms = (platforms) => [...new Set(
    (Array.isArray(platforms) ? platforms : [])
      .map((platform) => normalisePlatformName(typeof platform === 'object' ? platform?.name : platform))
      .filter(Boolean)
  )];

  const recordPlatformNames = (records) => normalisePlatforms(
    (Array.isArray(records) ? records : []).filter((record) => !isRecordExpired(record)).flatMap((record) => (
      Array.isArray(record?.changes) ? record.changes.map((change) => change?.platform) : []
    ))
  );

  const mergePlatforms = (platforms, records = []) => normalisePlatforms([
    ...(Array.isArray(platforms) ? platforms : []),
    ...recordPlatformNames(records)
  ]);

  function detectPlatforms(options = {}) {
    const variant = String(options.variant || options.platformVariant || '').trim().toLowerCase();
    const explicitSources = [
      options.platform,
      options.currentPlatform,
      document.documentElement?.dataset.platform,
      document.body?.dataset.platform,
      document.querySelector('#app')?.dataset.platform,
      document.querySelector('.app-layout')?.dataset.userEnd,
      document.title
    ].map((value) => String(value ?? '').trim()).filter(Boolean);
    const detected = [];
    platformCatalog.forEach((platform) => {
      const matchesVariant = variant && platform.variants.includes(variant);
      const matchesSource = explicitSources.some((source) => platform.tokens.some((token) => source.includes(token)));
      if ((matchesVariant || matchesSource) && !detected.includes(platform.name)) detected.push(platform.name);
    });
    return detected;
  }

  function normaliseRecord(record, index) {
    const source = record && typeof record === 'object' ? record : {};
    const legacyItems = Array.isArray(source.items) ? source.items.filter(Boolean) : [];
    const legacyChange = {
      platform: source.platform || '未设置',
      feature: source.feature || source.title || '',
      description: source.description || legacyItems.join('；') || ''
    };
    const hasLegacyChange = Boolean(
      legacyChange.feature.trim() || legacyChange.description.trim() || source.platform
    );
    const rawChanges = Array.isArray(source.changes) && source.changes.length
      ? source.changes
      : (hasLegacyChange ? [legacyChange] : []);
    const changes = rawChanges.map((change) => {
      const rawItems = Array.isArray(change?.items) ? change.items : [];
      const items = rawItems.map((item) => ({
        feature: String(item?.feature || item?.title || ''),
        description: String(item?.description || '')
      })).filter((item) => item.feature.trim() || item.description.trim());
      if (!items.length && (change?.feature || change?.title || change?.description)) {
        items.push({
          feature: String(change.feature || change.title || ''),
          description: String(change.description || '')
        });
      }
      return {
        platform: String(change?.platform || '未设置'),
        items
      };
    }).filter((change) => change.items.length);
    const deletedAt = String(source.deletedAt || '').trim();
    let deleteExpiresAt = String(source.deleteExpiresAt || '').trim();
    if (deletedAt && !deleteExpiresAt) {
      const deletedTime = Date.parse(deletedAt);
      if (Number.isFinite(deletedTime)) {
        deleteExpiresAt = new Date(deletedTime + defaultRecordRetentionDays * 24 * 60 * 60 * 1000).toISOString();
      }
    }
    return {
      id: String(source.id || source.recordId || createLegacyRecordId(source, index)),
      sequence: Number.isFinite(Number(source.sequence)) ? Math.max(1, Number(source.sequence)) : index + 1,
      name: source.name || source.version || `第${index + 1}次迭代`,
      date: source.date || '--',
      changes,
      ...(deletedAt ? { deletedAt, deleteExpiresAt } : {})
    };
  }

  function normaliseRecords(records) {
    return Array.isArray(records) ? records.map(normaliseRecord) : [];
  }

  function sourceData(data = null) {
    if (data && typeof data === 'object') {
      if (!Array.isArray(data.records)) data.records = [];
      return data;
    }
    if (!window.ProjectIterationData || typeof window.ProjectIterationData !== 'object') {
      window.ProjectIterationData = { schemaVersion: '20260826-1', records: [] };
    }
    if (!Array.isArray(window.ProjectIterationData.records)) window.ProjectIterationData.records = [];
    return window.ProjectIterationData;
  }

  function storageScope(options = {}) {
    return {
      kind: 'iteration',
      projectId: options.projectId || 'default'
    };
  }

  function getStorageKey(options = {}) {
    return options.storageKey || (options.projectId
      ? `${storageKey}:${options.projectId}`
      : storageKey);
  }

  function platformStorageScope(options = {}) {
    return {
      kind: 'iteration-platforms',
      projectId: options.projectId || 'default'
    };
  }

  function getPlatformStorageKey(options = {}) {
    return options.platformStorageKey || (options.projectId
      ? `${platformStorageKey}:${options.projectId}`
      : platformStorageKey);
  }

  function projectCodeSaveEndpoint(options = {}) {
    if (options.projectCodeSaveEndpoint) return options.projectCodeSaveEndpoint;
    return window.location.protocol === 'file:'
      ? 'http://127.0.0.1:4173/__iteration-code-save'
      : '/__iteration-code-save';
  }

  function saveProjectDataToCode(kind, value, options = {}) {
    if (!options.persistToProjectCode) return Promise.resolve(value);
    const context = {
      kind,
      projectId: options.projectId || 'default',
      value
    };
    if (typeof options.saveProjectData === 'function') {
      return Promise.resolve(options.saveProjectData(context));
    }
    return fetch(projectCodeSaveEndpoint(options), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      return result.value ?? value;
    });
  }

  function loadRecords(fallbackRecords, options = {}) {
    const scope = storageScope(options);
    try {
      const external = options.storage?.load?.(scope);
      const externalRecords = Array.isArray(external) ? external : external?.records;
      if (Array.isArray(externalRecords)) return normaliseRecords(externalRecords);
    } catch (error) {
      options.onError?.(error, { phase: 'load', scope });
    }

    const projectData = options.data || (options.syncGlobalData === false
      ? null
      : (window.ProjectIterationData && sourceData()));
    const hasProjectRecords = Boolean(projectData && Array.isArray(projectData.records));
    const projectRecords = normaliseRecords(projectData?.records);
    if (hasProjectRecords) {
      if (!projectRecords.length) {
        try {
          window.localStorage?.removeItem(getStorageKey(options));
        } catch (error) {
          // 代码数据仍然是权威来源，缓存不可用时无需阻断页面加载。
        }
      }
      return projectRecords;
    }
    if (options.storage) return normaliseRecords(fallbackRecords);
    try {
      const stored = window.localStorage?.getItem(getStorageKey(options));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return normaliseRecords(parsed);
      }
    } catch (error) {
      // file:// 页面或隐私设置可能禁用 localStorage，此时直接使用项目数据源。
    }
    return normaliseRecords(fallbackRecords);
  }

  function loadPlatforms(fallbackRecords, options = {}) {
    const scope = platformStorageScope(options);
    const recordPlatforms = recordPlatformNames(fallbackRecords);
    const withRecordPlatforms = (platforms) => mergePlatforms(platforms, fallbackRecords);
    try {
      const external = options.storage?.load?.(scope);
      const externalPlatforms = Array.isArray(external) ? external : external?.platforms;
      if (Array.isArray(externalPlatforms)) return withRecordPlatforms(externalPlatforms);
    } catch (error) {
      options.onError?.(error, { phase: 'load', scope });
    }

    if (Array.isArray(options.platforms)) return withRecordPlatforms(options.platforms);
    const projectData = options.data || (options.syncGlobalData === false ? null : sourceData());
    if (Array.isArray(projectData?.platforms)) return withRecordPlatforms(projectData.platforms);

    try {
      const stored = window.localStorage?.getItem(getPlatformStorageKey(options));
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedPlatforms = Array.isArray(parsed) ? parsed : parsed?.platforms;
        if (Array.isArray(storedPlatforms)) return withRecordPlatforms(storedPlatforms);
      }
    } catch (error) {
      // file:// 页面或隐私设置可能禁用 localStorage，此时回退到自动识别。
    }
    return withRecordPlatforms(detectPlatforms(options));
  }

  function persistRecords(records, options = {}) {
    const normalised = pruneExpiredRecords(normaliseRecords(records));
    const scope = storageScope(options);
    const projectData = options.data || (options.syncGlobalData === false ? null : sourceData());
    if (projectData) projectData.records = normalised.map(cloneRecord);

    let storagePromise = Promise.resolve();
    if (typeof options.storage?.save === 'function') {
      try {
        const result = options.storage.save(scope, normalised);
        storagePromise = Promise.resolve(result);
      } catch (error) {
        options.onError?.(error, { phase: 'save', scope });
        storagePromise = Promise.reject(error);
      }
    } else {
      try {
        window.localStorage?.setItem(getStorageKey(options), JSON.stringify(normalised));
      } catch (error) {
        // 无法使用 localStorage 时，当前页面仍保留已同步到项目数据对象的记录。
        options.onError?.(error, { phase: 'save', scope });
      }
    }
    options.onChange?.({ type: 'records', scope, records: normalised.map(cloneRecord) });
    const savePromise = Promise.all([
      storagePromise,
      saveProjectDataToCode('records', normalised, options)
    ]).then(() => normalised);
    savePromise.catch((error) => options.onError?.(error, { phase: 'save', scope }));
    return savePromise;
  }

  function persistPlatforms(platforms, options = {}) {
    const normalised = normalisePlatforms(platforms);
    const scope = platformStorageScope(options);
    const projectData = options.data || (options.syncGlobalData === false ? null : sourceData());
    const projectRecords = normaliseRecords(projectData?.records);
    const cleanedProjectRecords = pruneExpiredRecords(projectRecords);
    const cleanedExpiredRecords = cleanedProjectRecords.length !== projectRecords.length;
    if (projectData && cleanedExpiredRecords) projectData.records = cleanedProjectRecords.map(cloneRecord);
    if (projectData) projectData.platforms = [...normalised];

    let storagePromise = Promise.resolve();
    let recordsStoragePromise = Promise.resolve();
    if (typeof options.storage?.save === 'function') {
      try {
        const result = options.storage.save(scope, [...normalised]);
        storagePromise = Promise.resolve(result);
        if (cleanedExpiredRecords) {
          recordsStoragePromise = Promise.resolve(options.storage.save(storageScope(options), cleanedProjectRecords));
        }
      } catch (error) {
        options.onError?.(error, { phase: 'save', scope });
        storagePromise = Promise.reject(error);
      }
    } else {
      try {
        window.localStorage?.setItem(getPlatformStorageKey(options), JSON.stringify(normalised));
      } catch (error) {
        options.onError?.(error, { phase: 'save', scope });
      }
      if (cleanedExpiredRecords) {
        try {
          window.localStorage?.setItem(getStorageKey(options), JSON.stringify(cleanedProjectRecords));
        } catch (error) {
          options.onError?.(error, { phase: 'save', scope: storageScope(options) });
        }
      }
    }
    options.onChange?.({ type: 'platforms', scope, platforms: [...normalised] });
    if (cleanedExpiredRecords) {
      options.onChange?.({
        type: 'records',
        scope: storageScope(options),
        records: cleanedProjectRecords.map(cloneRecord)
      });
    }
    const savePromise = Promise.all([
      storagePromise,
      recordsStoragePromise,
      saveProjectDataToCode('platforms', [...normalised], options),
      cleanedExpiredRecords
        ? saveProjectDataToCode('records', cleanedProjectRecords, options)
        : Promise.resolve()
    ]).then(() => normalised);
    savePromise.catch((error) => options.onError?.(error, { phase: 'save', scope }));
    return savePromise;
  }

  function formatDateTime(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function formatDisplayDate(value) {
    const text = String(value ?? '').trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : text;
  }

  function renderRecords(records, pendingDeleteId = '') {
    const activeRecords = getActiveRecords(records);
    if (!activeRecords.length) return '';
    const displayRecords = activeRecords.slice().reverse();
    return displayRecords
      .map((record, displayIndex) => {
        const pendingDelete = pendingDeleteId === record.id;
        const displaySequence = displayRecords.length - displayIndex;
        return `
      <article class="project-iteration-record">
        <div class="project-iteration-record-marker" aria-hidden="true">${displaySequence}</div>
        <div class="project-iteration-record-content" data-project-iteration-record-content>
          <div class="project-iteration-record-heading" data-project-iteration-record-heading>
            <strong>${escapeHtml(record.name)}</strong>
            <button type="button" class="project-iteration-record-toggle project-iteration-record-heading-toggle" data-project-iteration-toggle aria-expanded="false" aria-label="展开" title="展开">${chevronDownIcon}</button>
            <div class="project-iteration-record-heading-actions">
              <time>${escapeHtml(formatDisplayDate(record.date))}</time>
              <button
                type="button"
                class="project-iteration-record-delete${pendingDelete ? ' is-pending' : ''}"
                data-project-iteration-delete="${escapeHtml(record.id)}"
                aria-label="${pendingDelete ? '再次点击确认删除' : '删除迭代记录'}"
                title="${pendingDelete ? '再次点击确认删除' : '删除迭代记录'}">${trashIcon}</button>
            </div>
          </div>
          ${renderRecordChanges(record)}
          <div class="project-iteration-record-footer">
            <button type="button" class="project-iteration-record-toggle project-iteration-record-footer-toggle" data-project-iteration-toggle aria-expanded="false" aria-label="展开" title="展开">展开</button>
            <button type="button" class="project-iteration-record-edit" data-project-iteration-edit="${escapeHtml(record.id)}">修改</button>
          </div>
        </div>
      </article>`;
      }).join('');
  }

  function formatTrashRemaining(deleteExpiresAt, now = Date.now()) {
    const remaining = Date.parse(deleteExpiresAt || '') - now;
    if (!Number.isFinite(remaining) || remaining <= 0) return '已过期';
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    if (days > 0) return `剩余 ${days} 天`;
    const hours = Math.max(1, Math.ceil(remaining / (60 * 60 * 1000)));
    return `剩余 ${hours} 小时`;
  }

  function renderTrash(records, pendingPermanentDeleteId = '') {
    const trashRecords = getTrashRecords(records);
    if (!trashRecords.length) {
      return '<div class="project-iteration-trash-empty">回收站为空</div>';
    }
    return trashRecords.slice().reverse().map((record) => `
      <div class="project-iteration-trash-item" data-project-iteration-trash-record="${escapeHtml(record.id)}">
        <div class="project-iteration-trash-item-main">
          <strong>${escapeHtml(record.name)}</strong>
          <span>${escapeHtml(formatDisplayDate(record.date))} · ${formatTrashRemaining(record.deleteExpiresAt)}</span>
        </div>
        <div class="project-iteration-trash-actions">
          <button type="button" class="project-iteration-trash-permanent-delete${pendingPermanentDeleteId === record.id ? ' is-pending' : ''}" data-project-iteration-permanent-delete="${escapeHtml(record.id)}" aria-label="${pendingPermanentDeleteId === record.id ? '再次点击确认彻底删除' : '彻底删除'}" title="${pendingPermanentDeleteId === record.id ? '再次点击确认彻底删除' : '彻底删除'}">${trashIcon}</button>
          <button type="button" class="project-iteration-trash-restore" data-project-iteration-restore="${escapeHtml(record.id)}">恢复</button>
        </div>
      </div>`).join('');
  }

  function renderRecordChanges(record) {
    const changes = Array.isArray(record.changes) ? record.changes : [];
    if (!changes.length) return '';
    return `
      <div class="project-iteration-record-field project-iteration-record-platform-function-summary">
        <div class="project-iteration-record-function-list">
          ${changes.map((change) => `
            <div class="project-iteration-record-function-row">
              <strong>${escapeHtml(change.platform)}</strong>
              <div class="project-iteration-record-function-tags">
                ${change.items.map((item) => `<span class="project-iteration-record-function-tag">${escapeHtml(item.feature)}</span>`).join('')}
              </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="project-iteration-record-detail-scroll" data-project-iteration-record-details hidden>
        <div class="project-iteration-record-detail-content">
          <div class="project-iteration-record-change-list">
          ${changes.map((change) => `
            <section class="project-iteration-record-change">
              <h4 data-project-iteration-platform-heading>${escapeHtml(change.platform)}</h4>
              ${(Array.isArray(change.items) ? change.items : []).map((item) => `
                <div class="project-iteration-record-pair">
                  <div class="project-iteration-record-field project-iteration-record-feature-row" data-project-iteration-feature-row><span>涉及功能</span><strong>${escapeHtml(item.feature)}</strong></div>
                  <div class="project-iteration-record-description"><span>描述</span><p data-project-iteration-description-text>${escapeHtml(item.description)}</p></div>
                </div>`).join('')}
            </section>`).join('')}
          </div>
        </div>
      </div>`;
  }

  function getSelectedPlatform(platforms, changes) {
    return platforms.find((option) => changes.some((change) => change.platform === option)) || platforms[0] || '';
  }

  function renderPlatformTabs(platforms, changes, selectedPlatform) {
    const changeMap = new Map(changes.map((change) => [change.platform, change]));
    return platforms.map((option) => {
      const change = changeMap.get(option);
      const isSelected = option === selectedPlatform;
      const hasContent = (change?.items || []).some((item) => item.feature?.trim() || hasDescriptionContent(item.description));
      return `
        <div
          class="project-iteration-platform-tab${isSelected ? ' is-selected' : ''}${hasContent ? ' is-filled' : ''}"
          data-project-iteration-platform-tab
          data-platform="${escapeHtml(option)}"
          role="tab"
          aria-selected="${String(isSelected)}">
          <button type="button" class="project-iteration-platform-tab-select" data-project-iteration-platform-select data-platform="${escapeHtml(option)}" aria-label="选择${escapeHtml(option)}">
            <span>${escapeHtml(option)}</span>
          </button>
          <button type="button" class="project-iteration-platform-tab-delete" data-project-iteration-platform-delete="${escapeHtml(option)}" aria-label="删除${escapeHtml(option)}" title="删除平台">×</button>
        </div>`;
    }).join('');
  }

  function isPlatformUsed(platform, records) {
    return (Array.isArray(records) ? records : []).some((record) => (
      Array.isArray(record?.changes)
      && record.changes.some((change) => change?.platform === platform && Array.isArray(change.items) && change.items.length)
    ));
  }

  function renderPlatformManager(_platforms, { showNewRow = false } = {}) {
    const newRow = showNewRow ? `
      <div class="project-iteration-platform-manager-row is-new" data-project-iteration-platform-new-row>
        <input type="text" data-project-iteration-platform-new-name placeholder="请输入平台名称" aria-label="新增平台名称">
        <button type="button" class="project-iteration-platform-manager-save project-iteration-platform-manager-create" data-project-iteration-platform-create aria-label="添加平台" title="添加平台">${arrowUpIcon}</button>
      </div>` : '';
    return newRow;
  }

  function renderChangePair(option, item, platformIndex, itemIndex, itemKey = itemIndex, { readonly = false, order = itemIndex } = {}) {
    const inputId = `projectIterationFeature-${platformIndex}-${itemKey}`;
    const descriptionId = `projectIterationDescription-${platformIndex}-${itemKey}`;
    return `
      <div class="project-iteration-change-pair${readonly ? ' is-readonly' : ''}" data-project-iteration-change-item data-platform="${escapeHtml(option)}" data-order="${order}">
        <div class="project-iteration-change-pair-heading">
          <button type="button" class="project-iteration-remove-change-button" data-project-iteration-remove-change aria-label="删除此功能-描述组">删除</button>
        </div>
        ${readonly ? `
          <div class="project-iteration-change-pair-readonly">
            <div class="project-iteration-change-pair-readonly-row"><span>涉及功能</span><strong>${escapeHtml(item.feature || '')}</strong></div>
            <div class="project-iteration-change-pair-readonly-row"><span>描述</span><p>${escapeHtml(item.description || '')}</p></div>
          </div>
          <input type="hidden" data-project-iteration-platform-feature data-platform="${escapeHtml(option)}" value="${escapeHtml(item.feature || '')}">
          <input type="hidden" data-project-iteration-platform-description data-platform="${escapeHtml(option)}" value="${escapeHtml(item.description || '')}">` : `
          <div class="project-iteration-form-item">
            <label for="${inputId}">涉及功能</label>
            <input id="${inputId}" data-project-iteration-platform-feature data-platform="${escapeHtml(option)}" value="${escapeHtml(item.feature || '')}" placeholder="请输入涉及的功能或模块">
          </div>
          <div class="project-iteration-form-item">
            <label for="${descriptionId}">描述</label>
            <textarea id="${descriptionId}" data-project-iteration-platform-description data-platform="${escapeHtml(option)}" rows="4" placeholder="请填写对应功能的需求内容">${escapeHtml(getDescriptionInputValue(item.description))}</textarea>
          </div>`}
      </div>`;
  }

  function renderPlatformPanels(platforms, changes, selectedPlatform) {
    const changeMap = new Map(changes.map((change) => [change.platform, change]));
    return platforms.map((option, index) => {
      const change = changeMap.get(option) || { platform: option, items: [] };
      const items = Array.isArray(change.items) && change.items.length
        ? change.items
        : [{ feature: '', description: '' }];
      const displayItems = items.map((item, itemIndex) => ({
        ...item,
        order: itemIndex
      })).reverse();
      const isSelected = option === selectedPlatform;
      return `
        <section
          class="project-iteration-platform-detail${isSelected ? ' is-active' : ''}"
          data-project-iteration-platform-panel
          data-platform="${escapeHtml(option)}"
          data-platform-index="${index}"
          role="tabpanel"
          aria-label="${escapeHtml(option)}"${isSelected ? '' : ' hidden'}>
          <button type="button" class="project-iteration-add-change-button" data-project-iteration-add-change>＋新增描述</button>
          <div class="project-iteration-change-pairs" data-project-iteration-change-items>
            ${displayItems.map((item, itemIndex) => renderChangePair(
              option,
              item,
              index,
              itemIndex,
              `${itemIndex}-${item.order}`,
              { readonly: itemIndex > 0, order: item.order }
            )).join('')}
          </div>
        </section>`;
    }).join('');
  }

  function renderForm(records, platforms, editingId = null, draftChanges = null) {
    const isEditing = Boolean(editingId && records.some((item) => item.id === editingId && !isRecordDeleted(item)));
    const currentSequence = Math.max(0, ...records.map((item, index) => Number(item.sequence) || index + 1)) + 1;
    const record = isEditing
      ? records.find((item) => item.id === editingId)
      : { id: '', sequence: currentSequence, name: `第${currentSequence}次迭代`, changes: [] };
    const selectedChanges = Array.isArray(draftChanges)
      ? draftChanges
      : (Array.isArray(record.changes) ? record.changes : []);
    const selectedPlatform = getSelectedPlatform(platforms, selectedChanges);
    return `
      <form class="project-iteration-form" data-project-iteration-form data-edit-id="${isEditing ? escapeHtml(editingId) : ''}" data-selected-platform="${escapeHtml(selectedPlatform)}">
        <div class="project-iteration-form-title">${isEditing ? '修改迭代记录' : '新建迭代记录'}</div>
        <div class="project-iteration-form-item">
          <label for="projectIterationName">迭代名称</label>
          <input id="projectIterationName" data-project-iteration-name value="${escapeHtml(record.name)}">
        </div>
        <div class="project-iteration-form-item">
          <div class="project-iteration-form-field-heading">
            <label>涉及平台</label>
            <button type="button" class="project-iteration-platform-settings" data-project-iteration-platform-settings aria-expanded="false" aria-label="编辑涉及平台" title="编辑涉及平台">
              ${gearIcon}
            </button>
          </div>
          <div class="project-iteration-platform-manager" data-project-iteration-platform-manager hidden>
            <div class="project-iteration-platform-manager-heading">
              <button type="button" class="project-iteration-platform-manager-add" data-project-iteration-platform-add>＋新增平台</button>
            </div>
            <div data-project-iteration-platform-manager-list>
            ${renderPlatformManager(platforms)}
            </div>
          </div>
          ${platforms.length ? `<div class="project-iteration-platform-tabs" role="tablist" aria-label="涉及平台">
            ${renderPlatformTabs(platforms, selectedChanges, selectedPlatform)}
          </div>` : ''}
        </div>
        <div class="project-iteration-platform-details" data-project-iteration-platform-details>
          ${renderPlatformPanels(platforms, selectedChanges, selectedPlatform)}
        </div>
        <div class="project-iteration-form-actions">
          <button type="button" class="project-iteration-secondary-button" data-project-iteration-cancel>取消</button>
          <button type="submit" class="project-iteration-primary-button">保存</button>
        </div>
      </form>`;
  }

  function mount(options = {}) {
    const {
      records = window.ProjectIterationData?.records || [],
      host,
      theme = true
    } = options;
    if (mountedRoot?.isConnected) return mountedRoot;
    const existingRoot = document.querySelector('.project-iteration-panel-root');
    if (existingRoot) {
      mountedRoot = existingRoot;
      return existingRoot;
    }

    let currentRecords = loadRecords(records, options);
    let currentPlatforms = loadPlatforms(currentRecords, options);
    const readOnly = resolveReadOnly(options);
    const root = document.createElement('div');
    root.className = 'project-iteration-panel-root';
    root.classList.toggle('is-readonly', readOnly);
    root.dataset.projectIterationReadOnly = String(readOnly);
    root.dataset.projectIterationPanel = 'true';
    root.innerHTML = `
      <div class="project-iteration-backdrop" data-project-iteration-close></div>
      <aside
        class="project-iteration-drawer"
        id="projectIterationPanel"
        role="dialog"
        aria-labelledby="projectIterationPanelTitle"
        aria-hidden="true"
        tabindex="-1">
        <header class="project-iteration-header">
          <div class="project-iteration-heading">
            <h2 id="projectIterationPanelTitle">迭代记录</h2>
            <div class="project-iteration-heading-tools">
              <button type="button" class="project-iteration-annotation-visibility-toggle" data-project-iteration-annotation-visibility aria-pressed="true" title="显示或隐藏页面标注按钮">
                <span class="project-iteration-annotation-visibility-label">标注</span>
                <span class="project-iteration-annotation-visibility-state" data-project-iteration-annotation-visibility-state>显示</span>
              </button>
              <div class="project-iteration-annotation-mode-host" data-project-iteration-annotation-mode-host></div>
            </div>
          </div>
          <div class="project-iteration-header-actions">
            <button class="project-iteration-close" type="button" data-project-iteration-close aria-label="关闭迭代记录">
              ${closeIcon}
            </button>
          </div>
        </header>
        <div class="project-iteration-body">
          <section class="project-iteration-section">
            <div class="project-iteration-record-toolbar" data-project-iteration-record-toolbar>
              <button type="button" class="project-iteration-primary-button project-iteration-new-button" data-project-iteration-new>新建记录</button>
              <button type="button" class="project-iteration-trash-toggle" data-project-iteration-trash-toggle aria-expanded="false" aria-label="打开回收站" title="打开回收站" hidden>
                ${trashIcon}
                <span class="project-iteration-trash-count" data-project-iteration-trash-count>0</span>
              </button>
            </div>
            <div class="project-iteration-trash" data-project-iteration-trash hidden></div>
            <div class="project-iteration-records" data-project-iteration-records>${renderRecords(currentRecords)}</div>
            <div data-project-iteration-form-host hidden></div>
          </section>
        </div>
      </aside>
      <div class="project-iteration-toast" data-project-iteration-toast role="alert" aria-live="assertive" aria-atomic="true"></div>`;

    const hostElement = host?.nodeType === 1 ? host : document.body;
    hostElement.appendChild(root);
    const toast = root.querySelector('[data-project-iteration-toast]');
    let toastTimer = null;
    const showToast = (message, type = 'error') => {
      if (!toast || !message) return;
      window.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.dataset.type = type;
      toast.classList.add('is-visible');
      toastTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
        toastTimer = null;
      }, 2000);
    };
    const annotationVisibilityStorageKey = options.annotationVisibilityStorageKey || 'prototype-tools-annotation-markers-visible-v1';
    const annotationVisibilityControlled = typeof options.annotationMarkersVisible === 'boolean';
    const readAnnotationMarkerVisibility = () => {
      if (annotationVisibilityControlled) return options.annotationMarkersVisible;
      try {
        const stored = window.localStorage.getItem(annotationVisibilityStorageKey);
        return stored === null ? true : stored !== 'false';
      } catch (error) {
        return true;
      }
    };
    let annotationMarkersVisible = readAnnotationMarkerVisibility();
    const syncAnnotationMarkerVisibilityControl = () => {
      const button = root.querySelector('[data-project-iteration-annotation-visibility]');
      const state = root.querySelector('[data-project-iteration-annotation-visibility-state]');
      if (!button) return;
      button.setAttribute('aria-pressed', String(annotationMarkersVisible));
      button.classList.toggle('is-off', !annotationMarkersVisible);
      if (state) state.textContent = annotationMarkersVisible ? '显示' : '隐藏';
      button.title = annotationMarkersVisible ? '隐藏页面标注' : '显示页面标注';
    };
    const persistAnnotationMarkerVisibility = (visible) => {
      if (annotationVisibilityControlled) return;
      try {
        window.localStorage.setItem(annotationVisibilityStorageKey, String(visible));
      } catch (error) {
        // file:// 或隐私模式禁用本地存储时，仍保留当前页面状态。
      }
    };
    const applyAnnotationMarkerVisibility = (visible, persist = true) => {
      annotationMarkersVisible = Boolean(visible);
      if (persist) persistAnnotationMarkerVisibility(annotationMarkersVisible);
      window.AnnotationOverlay?.setMarkerVisibility?.(annotationMarkersVisible);
      syncAnnotationMarkerVisibilityControl();
      return annotationMarkersVisible;
    };
    const attachAnnotationModeControl = () => {
      const attached = window.AnnotationOverlay?.attachModeControl?.(root) || false;
      applyAnnotationMarkerVisibility(annotationMarkersVisible, false);
      return attached;
    };
    const handleAnnotationReady = () => attachAnnotationModeControl();
    attachAnnotationModeControl();
    window.addEventListener('prototype-annotation-ready', handleAnnotationReady);
    if (theme !== false) {
      if (theme && typeof theme.apply === 'function') theme.apply(root);
      else window.PrototypeToolsTheme?.apply(root);
    }
    const drawer = root.querySelector('.project-iteration-drawer');
    const recordsHost = root.querySelector('[data-project-iteration-records]');
    const formHost = root.querySelector('[data-project-iteration-form-host]');
    const recordToolbar = root.querySelector('[data-project-iteration-record-toolbar]');
    const newButton = root.querySelector('[data-project-iteration-new]');
    const trashToggle = root.querySelector('[data-project-iteration-trash-toggle]');
    const trashCount = root.querySelector('[data-project-iteration-trash-count]');
    const trashHost = root.querySelector('[data-project-iteration-trash]');
    let editingId = null;
    let trashOpen = false;
    let pendingDeleteId = null;
    let pendingPermanentDeleteId = null;
    let pendingDeleteTimer = null;
    let pendingPermanentDeleteTimer = null;
    let isAtRightEdge = false;
    const edgeActivationWidth = 12;
    let nestedRecordScrollEndTimer = null;
    let nestedRecordOcclusionFrame = null;
    let nestedRecordLayoutCache = null;
    const nestedRecordScrollListenerOptions = { capture: true, passive: true };

    const syncNestedRecordStickyOffsets = () => {
      const body = root.querySelector('.project-iteration-body');
      if (body) {
        body.style.setProperty('--iteration-record-sticky-top', '0px');
      }
      root.querySelectorAll('.project-iteration-record').forEach((record) => {
        const content = record.querySelector('[data-project-iteration-record-content]');
        if (!content) return;
        content.style.setProperty('--iteration-record-heading-height', '28px');
        content.style.setProperty('--iteration-record-platform-height', '28px');
        content.style.setProperty('--iteration-record-feature-height', '28px');
      });
    };

    const nestedRecordOccludedClass = 'is-iteration-occluded';
    const nestedRecordFixedStackHeight = 28 * 3;
    const nestedRecordOcclusionLineOffset = 8;
    const nestedRecordMeasuringClass = 'is-iteration-layout-measuring';
    const nestedRecordOcclusionState = new WeakMap();

    const buildNestedRecordLayoutCache = () => {
      const body = root.querySelector('.project-iteration-body');
      if (!body) {
        nestedRecordLayoutCache = null;
        return null;
      }

      const scrollTop = body.scrollTop;
      const wasMeasuring = body.classList.contains(nestedRecordMeasuringClass);
      body.classList.add(nestedRecordMeasuringClass);
      try {
        const bodyRect = body.getBoundingClientRect();
        const measure = (element) => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            element,
            top: rect.top - bodyRect.top + scrollTop,
            width: rect.width,
            height: rect.height
          };
        };

        const records = [...root.querySelectorAll('.project-iteration-record')].map((record) => {
          const content = record.querySelector('[data-project-iteration-record-content]');
          const contentLayout = measure(content);
          const heading = measure(content?.querySelector('[data-project-iteration-record-heading]'));
          const platforms = [...content?.querySelectorAll('[data-project-iteration-platform-heading]') || []].map((element) => {
            const change = element.closest('.project-iteration-record-change');
            const changeLayout = measure(change);
            return {
              layout: measure(element),
              boundaryBottom: changeLayout ? changeLayout.top + changeLayout.height : null
            };
          });
          const features = [...content?.querySelectorAll('[data-project-iteration-feature-row]') || []].map((element) => {
            const pair = element.closest('.project-iteration-record-pair');
            const pairLayout = measure(pair);
            return {
              layout: measure(element),
              boundaryBottom: pairLayout ? pairLayout.top + pairLayout.height : null
            };
          });
          const descriptions = [...content?.querySelectorAll('.project-iteration-record-description') || []]
            .map((description) => ({
              label: measure(description.firstElementChild),
              paragraph: measure(description.querySelector('[data-project-iteration-description-text]'))
            }));
          const contentTop = contentLayout?.top ?? heading?.top ?? 0;
          const contentBottom = contentLayout
            ? contentLayout.top + contentLayout.height
            : contentTop + (heading?.height || 0);
          return {
            record,
            contentTop,
            contentBottom,
            heading,
            platforms,
            features,
            descriptions
          };
        });

        nestedRecordLayoutCache = {
          body,
          bodyTop: bodyRect.top,
          bodyHeight: bodyRect.height,
          records
        };
        return nestedRecordLayoutCache;
      } finally {
        if (!wasMeasuring) body.classList.remove(nestedRecordMeasuringClass);
      }
    };

    const getNestedRecordLayoutRect = (layout, cache, scrollTop, stickyTop = null, boundaryBottom = null) => {
      if (!layout || !layout.width || !layout.height || !cache) return null;
      let contentTop = layout.top;
      if (Number.isFinite(stickyTop)) {
        const stickyLimit = Number.isFinite(boundaryBottom)
          ? Math.max(layout.top, boundaryBottom - layout.height)
          : Number.POSITIVE_INFINITY;
        contentTop = Math.min(
          Math.max(layout.top, scrollTop + stickyTop),
          stickyLimit
        );
      }
      const top = cache.bodyTop + contentTop - scrollTop;
      return {
        element: layout.element,
        rect: {
          top,
          bottom: top + layout.height,
          width: layout.width,
          height: layout.height
        }
      };
    };

    const getNestedRecordOcclusionInsets = (rect, blockers) => {
      if (!rect?.width || !rect.height) return { top: 0, bottom: 0, fullyHidden: false };
      let top = 0;
      let bottom = 0;
      blockers.forEach((blocker) => {
        if (blocker.bottom <= rect.top || blocker.top >= rect.bottom) return;
        const overlapFromTop = Math.min(rect.height, Math.max(0, blocker.bottom - rect.top));
        const overlapFromBottom = Math.min(rect.height, Math.max(0, rect.bottom - blocker.top));
        if (blocker.top <= rect.top) top = Math.max(top, overlapFromTop);
        else if (blocker.bottom >= rect.bottom) bottom = Math.max(bottom, overlapFromBottom);
        else top = Math.max(top, overlapFromTop);
      });
      return {
        top,
        bottom,
        fullyHidden: top + bottom >= rect.height - 0.5
      };
    };

    const applyNestedRecordElementOcclusion = (measurement, blockers) => {
      if (!measurement?.element) return;
      const { element, rect } = measurement;
      const { top, bottom, fullyHidden } = getNestedRecordOcclusionInsets(rect, blockers);
      const topValue = `${Math.round(top * 10) / 10}px`;
      const bottomValue = `${Math.round(bottom * 10) / 10}px`;
      const stateKey = `${topValue}|${bottomValue}|${fullyHidden}`;
      if (nestedRecordOcclusionState.get(element) === stateKey) return;
      nestedRecordOcclusionState.set(element, stateKey);
      element.style.setProperty('--iteration-record-occlusion-top', topValue);
      element.style.setProperty('--iteration-record-occlusion-bottom', bottomValue);
      element.classList.toggle(nestedRecordOccludedClass, fullyHidden);
    };

    const getIncomingRecordTransitionBlocker = (cache, scrollTop, bodyRect) => {
      const incomingHeading = cache.records
        .map(({ heading, contentBottom }) => getNestedRecordLayoutRect(
          heading,
          cache,
          scrollTop,
          0,
          contentBottom
        ))
        .filter((heading) => heading?.rect && (
          heading.rect.bottom > bodyRect.top
          && heading.rect.top > bodyRect.top + 1
          && heading.rect.top < bodyRect.top + nestedRecordFixedStackHeight
        ))
        .sort((left, right) => left.rect.top - right.rect.top)[0];
      if (!incomingHeading) return null;
      return {
        top: bodyRect.top,
        bottom: Math.min(bodyRect.bottom, incomingHeading.rect.top)
      };
    };

    const getActiveNestedRecordBands = (snapshot, cache, scrollTop, bodyRect) => {
      const recordMeasurement = getNestedRecordLayoutRect(
        snapshot.heading,
        cache,
        scrollTop,
        0,
        snapshot.contentBottom
      );
      const platformMeasurements = snapshot.platforms
        .map(({ layout, boundaryBottom }) => getNestedRecordLayoutRect(
          layout,
          cache,
          scrollTop,
          28,
          boundaryBottom
        ))
        .filter(Boolean);
      const featureMeasurements = snapshot.features
        .map(({ layout, boundaryBottom }) => getNestedRecordLayoutRect(
          layout,
          cache,
          scrollTop,
          56,
          boundaryBottom
        ))
        .filter(Boolean);
      const toBand = (measurement) => {
        const rect = measurement?.rect;
        if (!rect || !rect.width || !rect.height || rect.bottom <= bodyRect.top || rect.top >= bodyRect.bottom) return null;
        return {
          top: Math.max(bodyRect.top, rect.top),
          bottom: Math.min(bodyRect.bottom, rect.bottom + nestedRecordOcclusionLineOffset)
        };
      };
      return {
        record: toBand(recordMeasurement),
        platforms: platformMeasurements.map(toBand).filter(Boolean),
        features: featureMeasurements.map(toBand).filter(Boolean),
        platformMeasurements,
        featureMeasurements
      };
    };

    const syncNestedRecordOcclusion = () => {
      const cache = nestedRecordLayoutCache?.body?.isConnected
        ? nestedRecordLayoutCache
        : buildNestedRecordLayoutCache();
      if (!cache) return;
      const body = cache.body;
      const scrollTop = body.scrollTop;
      const bodyRect = {
        top: cache.bodyTop,
        bottom: cache.bodyTop + cache.bodyHeight
      };
      const viewportStart = scrollTop - nestedRecordFixedStackHeight;
      const viewportEnd = scrollTop + cache.bodyHeight + nestedRecordFixedStackHeight;
      const transitionBlocker = getIncomingRecordTransitionBlocker(cache, scrollTop, bodyRect);
      cache.records.forEach((snapshot) => {
        if (snapshot.contentBottom <= viewportStart || snapshot.contentTop >= viewportEnd) return;
        const bands = getActiveNestedRecordBands(snapshot, cache, scrollTop, bodyRect);
        const recordBlockers = [
          ...(transitionBlocker ? [transitionBlocker] : []),
          ...(bands.record ? [bands.record] : [])
        ];
        const platformBlockers = [...recordBlockers, ...bands.platforms];
        const featureBlockers = [...platformBlockers, ...bands.features];
        bands.platformMeasurements.forEach((element) => applyNestedRecordElementOcclusion(element, recordBlockers));
        bands.featureMeasurements.forEach((element) => applyNestedRecordElementOcclusion(element, platformBlockers));
        snapshot.descriptions.forEach(({ label, paragraph }) => {
          applyNestedRecordElementOcclusion(
            getNestedRecordLayoutRect(label, cache, scrollTop),
            featureBlockers
          );
          applyNestedRecordElementOcclusion(
            getNestedRecordLayoutRect(paragraph, cache, scrollTop),
            featureBlockers
          );
        });
      });
    };

    const scheduleNestedRecordOcclusion = () => {
      if (nestedRecordOcclusionFrame !== null) return;
      const flush = () => {
        nestedRecordOcclusionFrame = null;
        syncNestedRecordOcclusion();
      };
      nestedRecordOcclusionFrame = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(flush)
        : window.setTimeout(flush, 16);
    };

    const handleNestedRecordScroll = (event) => {
      if (!event.target.closest?.('.project-iteration-body')) return;
      root.classList.add('is-project-iteration-scroll-active');
      if (nestedRecordScrollEndTimer !== null) window.clearTimeout(nestedRecordScrollEndTimer);
      nestedRecordScrollEndTimer = window.setTimeout(() => {
        nestedRecordScrollEndTimer = null;
        root.classList.remove('is-project-iteration-scroll-active');
      }, 100);
      scheduleNestedRecordOcclusion();
    };

    const renderRecordsView = () => {
      const trashRecords = getTrashRecords(currentRecords);
      recordsHost.innerHTML = renderRecords(currentRecords, pendingDeleteId);
      trashHost.innerHTML = renderTrash(currentRecords, pendingPermanentDeleteId);
      trashCount.textContent = String(trashRecords.length);
      trashToggle.hidden = !trashRecords.length;
      trashToggle.setAttribute('aria-expanded', String(trashOpen));
      trashHost.hidden = !trashOpen || !trashRecords.length;
      syncNestedRecordStickyOffsets();
      buildNestedRecordLayoutCache();
      syncNestedRecordOcclusion();
    };
    renderRecordsView();

    const clearPendingDeleteTimer = () => {
      if (pendingDeleteTimer !== null) window.clearTimeout(pendingDeleteTimer);
      pendingDeleteTimer = null;
    };

    const clearPendingPermanentDeleteTimer = () => {
      if (pendingPermanentDeleteTimer !== null) window.clearTimeout(pendingPermanentDeleteTimer);
      pendingPermanentDeleteTimer = null;
    };

    const resetPendingDeleteConfirmation = () => {
      clearPendingDeleteTimer();
      clearPendingPermanentDeleteTimer();
      pendingDeleteId = null;
      pendingPermanentDeleteId = null;
    };

    const armPendingDelete = (recordId) => {
      clearPendingDeleteTimer();
      pendingDeleteId = recordId;
      pendingDeleteTimer = window.setTimeout(() => {
        if (pendingDeleteId === recordId) {
          pendingDeleteId = null;
          renderRecordsView();
        }
        pendingDeleteTimer = null;
      }, deleteConfirmationWindowMs);
    };

    const armPendingPermanentDelete = (recordId) => {
      clearPendingPermanentDeleteTimer();
      pendingPermanentDeleteId = recordId;
      pendingPermanentDeleteTimer = window.setTimeout(() => {
        if (pendingPermanentDeleteId === recordId) {
          pendingPermanentDeleteId = null;
          renderRecordsView();
        }
        pendingPermanentDeleteTimer = null;
      }, deleteConfirmationWindowMs);
    };

    const syncRecordsSnapshot = (recordsToSync) => {
      const normalised = normaliseRecords(recordsToSync);
      const projectData = options.data || (options.syncGlobalData === false ? null : sourceData());
      if (projectData) projectData.records = normalised.map(cloneRecord);
      try {
        window.localStorage?.setItem(getStorageKey(options), JSON.stringify(normalised));
      } catch (error) {
        // 回滚仅用于恢复当前运行时状态；无法使用本地存储时不影响页面继续工作。
      }
    };

    const setOpen = (open) => {
      if (!open && !formHost.hidden) closeForm();
      if (!open) resetPendingDeleteConfirmation();
      root.classList.toggle('is-open', open);
      root.classList.remove('is-peeking');
      drawer.setAttribute('aria-hidden', String(!open));
      if (open) drawer.focus();
      else isAtRightEdge = false;
    };

    const setPeek = (peek) => {
      if (root.classList.contains('is-open')) return;
      root.classList.toggle('is-peeking', peek);
      drawer.setAttribute('aria-hidden', 'true');
    };

    const handleDocumentMouseMove = (event) => {
      const nextIsAtRightEdge = event.clientX >= window.innerWidth - edgeActivationWidth;
      isAtRightEdge = nextIsAtRightEdge;
      if (nextIsAtRightEdge && !root.classList.contains('is-open')) {
        setPeek(true);
        return;
      }
      if (!nextIsAtRightEdge
        && root.classList.contains('is-peeking')
        && !drawer.matches(':hover')) {
        setPeek(false);
      }
    };

    const closeForm = () => {
      editingId = null;
      resetPendingDeleteConfirmation();
      trashOpen = false;
      formHost.hidden = true;
      formHost.innerHTML = '';
      recordsHost.hidden = false;
      recordToolbar.hidden = false;
      newButton.hidden = false;
      renderRecordsView();
    };

    const openForm = (recordId = null) => {
      if (readOnly) return;
      editingId = recordId;
      resetPendingDeleteConfirmation();
      trashOpen = false;
      formHost.innerHTML = renderForm(currentRecords, currentPlatforms, editingId);
      formHost.hidden = false;
      recordsHost.hidden = true;
      recordToolbar.hidden = true;
      trashHost.hidden = true;
      newButton.hidden = true;
      const form = formHost.querySelector('[data-project-iteration-form]');
      syncPlatformTabState(form);
      form.querySelectorAll('[data-project-iteration-change-items]').forEach(syncRemoveChangeButtons);
      findPlatformElement(form, 'input[data-project-iteration-platform-feature]:not([type="hidden"])', form.dataset.selectedPlatform)?.focus();
    };

    const findPlatformElement = (form, selector, platform) => [...(form?.querySelectorAll(selector) || [])]
      .find((element) => element.dataset.platform === platform);

    const findPlatformPanel = (form, platform) => [...(form?.querySelectorAll('[data-project-iteration-platform-panel]') || [])]
      .find((element) => element.dataset.platform === platform);

    const resizeDescriptionTextarea = (textarea) => {
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.overflowY = 'hidden';
      const body = textarea.closest('.project-iteration-body');
      const form = textarea.closest('.project-iteration-form');
      const bodyRect = body?.getBoundingClientRect();
      const formRect = form?.getBoundingClientRect();
      const reserveHeight = 168;
      const maxHeight = bodyRect && formRect
        ? Math.max(128, bodyRect.bottom - formRect.top - reserveHeight)
        : 360;
      const nextHeight = Math.max(112, Math.min(textarea.scrollHeight, maxHeight));
      textarea.style.height = `${nextHeight}px`;
      if (textarea.scrollHeight > nextHeight + 1) textarea.style.overflowY = 'auto';
    };

    const bindNumberedDescriptionInput = (textarea) => {
      if (!textarea || textarea.dataset.numberedDescriptionBound === 'true') return;
      if (!textarea.value.trim()) textarea.value = '1. ';
      textarea.dataset.numberedDescriptionBound = 'true';
      textarea.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.isComposing) return;
        event.preventDefault();
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? start;
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(end);
        const nextNumber = getNextDescriptionNumber(before);
        const prefix = before && !before.endsWith('\n') ? '\n' : '';
        const insertion = `${prefix}${nextNumber}. `;
        textarea.value = `${before}${insertion}${after}`;
        const cursor = before.length + insertion.length;
        textarea.setSelectionRange(cursor, cursor);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };

    const bindNumberedDescriptionInputs = (scope) => {
      scope?.querySelectorAll('textarea[data-project-iteration-platform-description]')
        .forEach(bindNumberedDescriptionInput);
    };

    const resizePlatformDescriptions = (form, platform) => {
      const panel = findPlatformPanel(form, platform);
      panel?.querySelectorAll('textarea[data-project-iteration-platform-description]').forEach(resizeDescriptionTextarea);
    };

    const syncPlatformTabState = (form) => {
      if (!form) return;
      bindNumberedDescriptionInputs(form);
      const selectedPlatform = form.dataset.selectedPlatform;
      form.querySelectorAll('[data-project-iteration-platform-tab]').forEach((button) => {
        const platform = button.dataset.platform;
        const panel = findPlatformPanel(form, platform);
        const hasContent = Boolean([...panel?.querySelectorAll('[data-project-iteration-change-item]') || []]
          .some((item) => item.querySelector('[data-project-iteration-platform-feature]')?.value.trim()
            || hasDescriptionContent(item.querySelector('[data-project-iteration-platform-description]')?.value)));
        const isSelected = platform === selectedPlatform;
        button.classList.toggle('is-selected', isSelected);
        button.classList.toggle('is-filled', hasContent);
        button.setAttribute('aria-selected', String(isSelected));
      });
      form.querySelectorAll('[data-project-iteration-platform-panel]').forEach((panel) => {
        const isSelected = panel.dataset.platform === selectedPlatform;
        panel.hidden = !isSelected;
        panel.classList.toggle('is-active', isSelected);
      });
      resizePlatformDescriptions(form, selectedPlatform);
    };

    const setActivePlatform = (form, platform) => {
      if (!form || !currentPlatforms.includes(platform)) return;
      form.dataset.selectedPlatform = platform;
      syncPlatformTabState(form);
    };

    const collectFormChanges = (form) => currentPlatforms.map((platform) => {
      const panel = findPlatformPanel(form, platform);
      const items = [...panel?.querySelectorAll('[data-project-iteration-change-item]') || []]
        .map((item) => ({
          order: Number(item.dataset.order),
          feature: item.querySelector('[data-project-iteration-platform-feature]')?.value.trim() || '',
          description: item.querySelector('[data-project-iteration-platform-description]')?.value.trim() || ''
        }))
        .filter((item) => item.feature || hasDescriptionContent(item.description))
        .sort((left, right) => left.order - right.order)
        .map(({ feature, description }) => ({
          feature,
          description
        }));
      return {
        platform,
        items
      };
    }).filter((change) => change.items.length);

    const refreshForm = (form, draftChanges = collectFormChanges(form), selectedPlatform = '') => {
      const name = form.querySelector('[data-project-iteration-name]')?.value || '';
      formHost.innerHTML = renderForm(currentRecords, currentPlatforms, editingId, draftChanges);
      const nextForm = formHost.querySelector('[data-project-iteration-form]');
      const nameInput = nextForm?.querySelector('[data-project-iteration-name]');
      if (nameInput) nameInput.value = name;
      if (nextForm && selectedPlatform && currentPlatforms.includes(selectedPlatform)) {
        nextForm.dataset.selectedPlatform = selectedPlatform;
      }
      syncPlatformTabState(nextForm);
      nextForm?.querySelectorAll('[data-project-iteration-change-items]').forEach(syncRemoveChangeButtons);
      return nextForm;
    };

    const handleFormInput = (event) => {
      const field = event.target.closest('[data-project-iteration-platform-feature], [data-project-iteration-platform-description]');
      if (!field) return;
      const form = field.closest('[data-project-iteration-form]');
      syncPlatformTabState(form);
    };

    const handlePanelResize = () => {
      const form = formHost.querySelector('[data-project-iteration-form]');
      if (form) resizePlatformDescriptions(form, form.dataset.selectedPlatform);
      syncNestedRecordStickyOffsets();
      buildNestedRecordLayoutCache();
      syncNestedRecordOcclusion();
    };

    const renumberChangePairs = (itemsHost) => {
      itemsHost?.querySelectorAll('[data-project-iteration-change-item]').forEach((item) => {
        const removeButton = item.querySelector('[data-project-iteration-remove-change]');
        if (removeButton) removeButton.setAttribute('aria-label', '删除此功能-描述组');
      });
    };

    const syncRemoveChangeButtons = (itemsHost) => {
      if (!itemsHost) return;
      renumberChangePairs(itemsHost);
      const canRemove = itemsHost.querySelectorAll('[data-project-iteration-change-item]').length > 1;
      itemsHost.querySelectorAll('[data-project-iteration-remove-change]').forEach((button) => {
        button.hidden = !canRemove;
      });
    };

    const addChangePair = (button) => {
      const panel = button.closest('[data-project-iteration-platform-panel]');
      const itemsHost = panel?.querySelector('[data-project-iteration-change-items]');
      if (!panel || !itemsHost) return;
      const platformIndex = panel.dataset.platformIndex || '0';
      const existingItems = [...itemsHost.querySelectorAll('[data-project-iteration-change-item]')]
        .map((item) => ({
          feature: item.querySelector('[data-project-iteration-platform-feature]')?.value.trim() || '',
          description: item.querySelector('[data-project-iteration-platform-description]')?.value.trim() || '',
          order: Number(item.dataset.order)
        }))
        .filter((item) => item.feature || hasDescriptionContent(item.description));
      const nextOrder = existingItems.reduce((max, item) => Math.max(max, item.order), -1) + 1;
      itemsHost.innerHTML = [
        { feature: '', description: '', order: nextOrder },
        ...existingItems
      ].map((item, itemIndex) => renderChangePair(
        panel.dataset.platform,
        item,
        platformIndex,
        itemIndex,
        `${itemIndex}-${Date.now()}`,
        { readonly: itemIndex > 0, order: item.order }
      )).join('');
      syncRemoveChangeButtons(itemsHost);
      const form = panel.closest('[data-project-iteration-form]');
      syncPlatformTabState(form);
      itemsHost.querySelector('[data-project-iteration-change-item] input[data-project-iteration-platform-feature]:not([type="hidden"])')?.focus();
    };

    const removeChangePair = (button) => {
      const item = button.closest('[data-project-iteration-change-item]');
      const itemsHost = item?.closest('[data-project-iteration-change-items]');
      if (!item || !itemsHost || itemsHost.querySelectorAll('[data-project-iteration-change-item]').length <= 1) return;
      item.remove();
      syncRemoveChangeButtons(itemsHost);
      syncPlatformTabState(itemsHost.closest('[data-project-iteration-form]'));
    };

    const activateChangePair = (item) => {
      const itemsHost = item.closest('[data-project-iteration-change-items]');
      const panel = item.closest('[data-project-iteration-platform-panel]');
      const form = item.closest('[data-project-iteration-form]');
      if (!itemsHost || !panel || !form) return;
      const targetOrder = item.dataset.order;
      const currentItems = [...itemsHost.querySelectorAll('[data-project-iteration-change-item]')]
        .map((currentItem) => ({
          feature: currentItem.querySelector('[data-project-iteration-platform-feature]')?.value.trim() || '',
          description: currentItem.querySelector('[data-project-iteration-platform-description]')?.value.trim() || '',
          order: Number(currentItem.dataset.order)
        }));
      itemsHost.innerHTML = currentItems.map((currentItem, itemIndex) => renderChangePair(
        panel.dataset.platform,
        currentItem,
        panel.dataset.platformIndex || '0',
        itemIndex,
        `${itemIndex}-${Date.now()}`,
        { readonly: String(currentItem.order) !== targetOrder, order: currentItem.order }
      )).join('');
      syncRemoveChangeButtons(itemsHost);
      syncPlatformTabState(form);
      [...itemsHost.querySelectorAll('[data-project-iteration-change-item]')]
        .find((currentItem) => currentItem.dataset.order === targetOrder)
        ?.querySelector('input[data-project-iteration-platform-feature]:not([type="hidden"])')
        ?.focus();
    };

    const setPlatformManagerError = (_form, message = '') => {
      if (message) showToast(message, 'error');
    };

    const renderPlatformManagerList = (form, { showNewRow = false } = {}) => {
      const list = form?.querySelector('[data-project-iteration-platform-manager-list]');
      if (!list) return;
      list.innerHTML = renderPlatformManager(currentPlatforms, { showNewRow });
    };

    const setPlatformManagerOpen = (form, open) => {
      const manager = form?.querySelector('[data-project-iteration-platform-manager]');
      const settingsButton = form?.querySelector('[data-project-iteration-platform-settings]');
      const addButton = form?.querySelector('[data-project-iteration-platform-add]');
      if (!manager || !settingsButton) return;
      if (!open) {
        renderPlatformManagerList(form);
        setPlatformManagerError(form);
      }
      manager.hidden = !open;
      settingsButton.setAttribute('aria-expanded', String(open));
      form.classList.toggle('is-platform-manager-open', open);
      if (addButton) addButton.hidden = Boolean(manager.querySelector('[data-project-iteration-platform-new-row]'));
    };

    const renameRecordPlatforms = (from, to) => currentRecords.map((record) => ({
      ...record,
      changes: (record.changes || []).map((change) => ({
        ...change,
        platform: change.platform === from ? to : change.platform
      }))
    }));

    const platformNameExists = (name, except = '') => currentPlatforms.some((platform) => (
      platform !== except && platform.toLocaleLowerCase() === name.toLocaleLowerCase()
    ));

    const renamePlatform = (target, explicitFrom = '', explicitTo = '') => {
      const form = target.closest('[data-project-iteration-form]');
      const row = target.closest('[data-project-iteration-platform-row]');
      const tab = target.closest('[data-project-iteration-platform-tab]');
      const from = normalisePlatformName(explicitFrom || row?.dataset.platform || tab?.dataset.platform || target.dataset.projectIterationPlatformRename);
      const to = normalisePlatformName(explicitTo || row?.querySelector('[data-project-iteration-platform-name]')?.value || target.value);
      if (!form || !from) return false;
      if (!to) {
        setPlatformManagerError(form, '平台名称不能为空。');
        return false;
      }
      if (platformNameExists(to, from)) {
        setPlatformManagerError(form, '平台名称已存在，请换一个名称。');
        return false;
      }
      if (from === to) {
        setPlatformManagerError(form);
        return true;
      }
      const draftChanges = collectFormChanges(form).map((change) => ({
        ...change,
        platform: change.platform === from ? to : change.platform
      }));
      const previousRecords = currentRecords;
      const previousPlatforms = currentPlatforms;
      currentPlatforms = currentPlatforms.map((platform) => platform === from ? to : platform);
      currentRecords = renameRecordPlatforms(from, to);
      Promise.all([
        persistRecords(currentRecords, options),
        persistPlatforms(currentPlatforms, options)
      ]).catch(() => {
        currentRecords = previousRecords;
        currentPlatforms = previousPlatforms;
        setPlatformManagerError(form, '无法保存涉及平台，请先启动项目代码保存服务。');
      });
      const nextForm = refreshForm(form, draftChanges, to);
      setPlatformManagerOpen(nextForm, true);
      return true;
    };

    const restorePlatformTabEditor = (tab, input, selectButton) => {
      if (!tab || !input || !selectButton) return;
      input.replaceWith(selectButton);
      tab.classList.remove('is-renaming');
    };

    const startPlatformTabRename = (tab) => {
      const form = tab?.closest('[data-project-iteration-form]');
      const selectButton = tab?.querySelector('[data-project-iteration-platform-select]');
      if (!form?.classList.contains('is-platform-manager-open') || !selectButton || tab.classList.contains('is-renaming')) return;
      const platform = normalisePlatformName(tab.dataset.platform);
      if (!platform) return;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'project-iteration-platform-tab-edit-input';
      input.value = platform;
      input.setAttribute('aria-label', `编辑${platform}名称`);
      input.title = '输入新名称后按 Enter 或移开输入框保存';
      tab.classList.add('is-renaming');
      selectButton.replaceWith(input);
      input.focus();
      input.select();

      let finished = false;
      const restore = () => {
        if (finished) return;
        finished = true;
        restorePlatformTabEditor(tab, input, selectButton);
      };
      const commit = () => {
        if (finished) return;
        const nextName = normalisePlatformName(input.value);
        if (nextName === platform) {
          setPlatformManagerError(form);
          restore();
          return;
        }
        if (renamePlatform(input, platform, nextName)) finished = true;
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          input.blur();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          restore();
        }
      });
    };

    const createPlatform = (button) => {
      const form = button.closest('[data-project-iteration-form]');
      const name = normalisePlatformName(form?.querySelector('[data-project-iteration-platform-new-name]')?.value);
      if (!form) return;
      if (!name) {
        setPlatformManagerError(form, '平台名称不能为空。');
        return;
      }
      if (platformNameExists(name)) {
        setPlatformManagerError(form, '平台名称已存在，请换一个名称。');
        return;
      }
      const draftChanges = collectFormChanges(form);
      const previousPlatforms = currentPlatforms;
      currentPlatforms = [...currentPlatforms, name];
      persistPlatforms(currentPlatforms, options).catch(() => {
        currentPlatforms = previousPlatforms;
        setPlatformManagerError(form, '无法保存新增平台，请先启动项目代码保存服务。');
      });
      const nextForm = refreshForm(form, draftChanges, name);
      renderPlatformManagerList(nextForm, { showNewRow: true });
      setPlatformManagerOpen(nextForm, true);
      nextForm?.querySelector('[data-project-iteration-platform-new-name]')?.focus();
    };

    const deletePlatform = (button) => {
      const form = button.closest('[data-project-iteration-form]');
      const platform = normalisePlatformName(button.dataset.projectIterationPlatformDelete);
      if (!form || !platform) return false;
      if (isPlatformUsed(platform, currentRecords)) {
        setPlatformManagerError(form, `“${platform}”已有迭代记录，不能删除。`);
        return false;
      }
      const draftChanges = collectFormChanges(form).filter((change) => change.platform !== platform);
      const previousPlatforms = currentPlatforms;
      currentPlatforms = currentPlatforms.filter((item) => item !== platform);
      persistPlatforms(currentPlatforms, options).catch(() => {
        currentPlatforms = previousPlatforms;
        setPlatformManagerError(form, '无法删除平台，请先启动项目代码保存服务。');
      });
      const nextForm = refreshForm(form, draftChanges, currentPlatforms[0] || '');
      setPlatformManagerOpen(nextForm, true);
      return true;
    };

    const deleteRecord = async (button) => {
      const recordId = button.dataset.projectIterationDelete;
      const record = currentRecords.find((item) => item.id === recordId && !isRecordDeleted(item));
      if (!record) return;
      const previousRecords = currentRecords.map(cloneRecord);
      const retentionDays = getRecordRetentionDays(options);
      const deletedAt = new Date();
      const deleteExpiresAt = new Date(
        deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000
      );
      const nextRecords = currentRecords.map((item) => item.id === recordId
        ? {
          ...item,
          deletedAt: deletedAt.toISOString(),
          deleteExpiresAt: deleteExpiresAt.toISOString()
        }
        : item);
      try {
        const savedRecords = await persistRecords(nextRecords, options);
        currentRecords = savedRecords;
        renderRecordsView();
        showToast(`“${record.name}”已删除，${retentionDays}天内可在回收站恢复。`, 'success');
      } catch (error) {
        currentRecords = previousRecords;
        syncRecordsSnapshot(previousRecords);
        renderRecordsView();
        showToast('无法删除迭代记录，请先启动项目代码保存服务。', 'error');
      }
    };

    const restoreRecord = async (button) => {
      const recordId = button.dataset.projectIterationRestore;
      const record = currentRecords.find((item) => item.id === recordId && isRecordDeleted(item));
      if (!record) return;
      if (isRecordExpired(record)) {
        renderRecordsView();
        showToast(`该迭代记录已超过${getRecordRetentionDays(options)}天恢复期限，无法找回。`, 'error');
        return;
      }
      const previousRecords = currentRecords.map(cloneRecord);
      const nextRecords = currentRecords.map((item) => {
        if (item.id !== recordId) return item;
        const restored = { ...item };
        delete restored.deletedAt;
        delete restored.deleteExpiresAt;
        return restored;
      });
      try {
        const savedRecords = await persistRecords(nextRecords, options);
        currentRecords = savedRecords;
        renderRecordsView();
        showToast(`“${record.name}”已恢复。`, 'success');
      } catch (error) {
        currentRecords = previousRecords;
        syncRecordsSnapshot(previousRecords);
        renderRecordsView();
        showToast('无法恢复迭代记录，请先启动项目代码保存服务。', 'error');
      }
    };

    const permanentlyDeleteRecord = async (button) => {
      const recordId = button.dataset.projectIterationPermanentDelete;
      const record = currentRecords.find((item) => item.id === recordId && isRecordDeleted(item));
      if (!record) return;
      const previousRecords = currentRecords.map(cloneRecord);
      const nextRecords = currentRecords.filter((item) => item.id !== recordId);
      try {
        const savedRecords = await persistRecords(nextRecords, options);
        currentRecords = savedRecords;
        pendingPermanentDeleteId = null;
        renderRecordsView();
        showToast(`“${record.name}”已彻底删除。`, 'success');
      } catch (error) {
        currentRecords = previousRecords;
        pendingPermanentDeleteId = null;
        syncRecordsSnapshot(previousRecords);
        renderRecordsView();
        showToast('无法彻底删除迭代记录，请先启动项目代码保存服务。', 'error');
      }
    };

    const toggleRecordDetails = (record) => {
      const details = record?.querySelector('[data-project-iteration-record-details]');
      const toggleButtons = [...(record?.querySelectorAll('[data-project-iteration-toggle]') || [])];
      const toggleButton = toggleButtons[0];
      if (!details || !toggleButton) return false;
      const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !isExpanded;
      details.hidden = isExpanded;
      toggleButtons.forEach((button) => {
        button.setAttribute('aria-expanded', String(nextExpanded));
        button.setAttribute('aria-label', isExpanded ? '展开' : '收起');
        button.title = isExpanded ? '展开' : '收起';
        button.innerHTML = button.classList.contains('project-iteration-record-footer-toggle')
          ? (isExpanded ? '展开' : '收起')
          : (isExpanded ? chevronDownIcon : chevronUpIcon);
      });
      record.classList.toggle('is-record-expanded', nextExpanded);
      syncNestedRecordStickyOffsets();
      buildNestedRecordLayoutCache();
      syncNestedRecordOcclusion();
      return true;
    };

    const handleClick = (event) => {
      if (readOnly && event.target.closest([
        '[data-project-iteration-new]',
        '[data-project-iteration-edit]',
        '[data-project-iteration-delete]',
        '[data-project-iteration-trash-toggle]',
        '[data-project-iteration-permanent-delete]',
        '[data-project-iteration-restore]',
        '[data-project-iteration-platform-settings]',
        '[data-project-iteration-platform-add]',
        '[data-project-iteration-platform-create]',
        '[data-project-iteration-platform-delete]',
        '[data-project-iteration-add-change]',
        '[data-project-iteration-remove-change]'
      ].join(', '))) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!root.classList.contains('is-open')
        && root.classList.contains('is-peeking')
        && event.target.closest('.project-iteration-drawer')) {
        setOpen(true);
        return;
      }
      const annotationVisibilityToggle = event.target.closest('[data-project-iteration-annotation-visibility]');
      if (annotationVisibilityToggle) {
        event.preventDefault();
        applyAnnotationMarkerVisibility(!annotationMarkersVisible);
        return;
      }
      const trashToggleButton = event.target.closest('[data-project-iteration-trash-toggle]');
      if (trashToggleButton) {
        trashOpen = !trashOpen;
        renderRecordsView();
        return;
      }
      const permanentDeleteButton = event.target.closest('[data-project-iteration-permanent-delete]');
      if (permanentDeleteButton) {
        const recordId = permanentDeleteButton.dataset.projectIterationPermanentDelete;
        if (pendingPermanentDeleteId === recordId) {
          clearPendingPermanentDeleteTimer();
          pendingPermanentDeleteId = null;
          permanentlyDeleteRecord(permanentDeleteButton);
        } else {
          armPendingPermanentDelete(recordId);
          renderRecordsView();
          showToast('再次点击确认彻底删除。', 'error');
        }
        return;
      }
      const restoreButton = event.target.closest('[data-project-iteration-restore]');
      if (restoreButton) {
        restoreRecord(restoreButton);
        return;
      }
      const recordDeleteButton = event.target.closest('[data-project-iteration-delete]');
      if (recordDeleteButton) {
        const recordId = recordDeleteButton.dataset.projectIterationDelete;
        if (pendingDeleteId === recordId) {
          clearPendingDeleteTimer();
          pendingDeleteId = null;
          deleteRecord(recordDeleteButton);
        } else {
          armPendingDelete(recordId);
          renderRecordsView();
          showToast('再次点击确认删除。', 'error');
        }
        return;
      }
      const platformDelete = event.target.closest('[data-project-iteration-platform-delete]');
      if (platformDelete) {
        event.stopPropagation();
        return;
      }
      const platformTab = event.target.closest('[data-project-iteration-platform-tab]');
      if (platformTab) {
        setActivePlatform(platformTab.closest('[data-project-iteration-form]'), platformTab.dataset.platform);
        return;
      }
      const platformSettings = event.target.closest('[data-project-iteration-platform-settings]');
      if (platformSettings) {
        const form = platformSettings.closest('[data-project-iteration-form]');
        const manager = form?.querySelector('[data-project-iteration-platform-manager]');
        setPlatformManagerOpen(form, Boolean(manager?.hidden));
        return;
      }
      const platformAdd = event.target.closest('[data-project-iteration-platform-add]');
      if (platformAdd) {
        const form = platformAdd.closest('[data-project-iteration-form]');
        renderPlatformManagerList(form, { showNewRow: true });
        setPlatformManagerOpen(form, true);
        form?.querySelector('[data-project-iteration-platform-new-name]')?.focus();
        return;
      }
      const platformCreate = event.target.closest('[data-project-iteration-platform-create]');
      if (platformCreate) {
        createPlatform(platformCreate);
        return;
      }
      const addButton = event.target.closest('[data-project-iteration-add-change]');
      if (addButton) {
        addChangePair(addButton);
        return;
      }
      const removeButton = event.target.closest('[data-project-iteration-remove-change]');
      if (removeButton) {
        removeChangePair(removeButton);
        return;
      }
      const changePair = event.target.closest('[data-project-iteration-change-item]');
      if (changePair?.classList.contains('is-readonly')) {
        activateChangePair(changePair);
        return;
      }
      const toggleButton = event.target.closest('[data-project-iteration-toggle]');
      if (toggleButton) {
        toggleRecordDetails(toggleButton.closest('.project-iteration-record'));
        return;
      }
      const recordCard = event.target.closest('.project-iteration-record');
      const recordContent = recordCard?.querySelector('[data-project-iteration-record-content]');
      const isBlankCardArea = event.target === recordCard
        || event.target === recordContent
        || event.target.matches?.(
          '[data-project-iteration-record-heading], .project-iteration-record-heading-actions, .project-iteration-record-footer, .project-iteration-record-change, .project-iteration-record-detail-content'
        );
      if (recordCard && isBlankCardArea) {
        toggleRecordDetails(recordCard);
        return;
      }
      if (event.target.closest('[data-project-iteration-new]')) {
        openForm();
        return;
      }
      const editButton = event.target.closest('[data-project-iteration-edit]');
      if (editButton) {
        const recordId = editButton.dataset.projectIterationEdit;
        if (currentRecords.some((record) => record.id === recordId && !isRecordDeleted(record))) openForm(recordId);
        return;
      }
      if (event.target.closest('[data-project-iteration-cancel]')) {
        closeForm();
        return;
      }
      if (event.target.closest('[data-project-iteration-close]')) setOpen(false);
    };

    const handleDoubleClick = (event) => {
      if (readOnly) return;
      const platformDelete = event.target.closest('[data-project-iteration-platform-delete]');
      if (platformDelete) {
        event.preventDefault();
        event.stopPropagation();
        deletePlatform(platformDelete);
        return;
      }
      const platformTab = event.target.closest('[data-project-iteration-platform-tab]');
      if (platformTab) {
        event.preventDefault();
        startPlatformTabRename(platformTab);
      }
    };

    const handleSubmit = async (event) => {
      const form = event.target.closest('[data-project-iteration-form]');
      if (!form) return;
      event.preventDefault();
      if (readOnly) return;
      const changes = collectFormChanges(form);
      if (!changes.length || changes.some((change) => change.items.some((item) => !item.feature || !hasDescriptionContent(item.description)))) {
        showToast('请至少填写一个端的功能-描述；每条涉及功能都需填写对应描述。', 'error');
        return;
      }

      const editId = form.dataset.editId || '';
      const currentRecord = currentRecords.find((record) => record.id === editId && !isRecordDeleted(record));
      const nextSequence = Math.max(0, ...currentRecords.map((record, index) => Number(record.sequence) || index + 1)) + 1;
      const defaultName = currentRecord?.name || `第${nextSequence}次迭代`;
      const name = form.querySelector('[data-project-iteration-name]')?.value.trim() || defaultName;
      const isEditing = Boolean(currentRecord);
      const nextRecords = isEditing
        ? currentRecords.map((item) => item.id === editId
          ? { ...item, name, changes }
          : item)
        : [...currentRecords, {
          id: createNewRecordId(),
          sequence: nextSequence,
          name,
          date: formatDateTime(),
          changes
        }];
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = '保存中...';
      }
      try {
        await persistPlatforms(currentPlatforms, options);
        currentRecords = await persistRecords(nextRecords, options);
        closeForm();
      } catch (saveError) {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = '保存';
        }
        showToast('无法写入项目代码，请先启动项目代码保存服务。', 'error');
        return;
      }
    };

    const handleDocumentKeydown = (event) => {
      if (event.key === 'Escape' && root.classList.contains('is-open')) setOpen(false);
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    root.addEventListener('click', handleClick);
    root.addEventListener('dblclick', handleDoubleClick);
    root.addEventListener('input', handleFormInput);
    root.addEventListener('submit', handleSubmit);
    root.addEventListener('scroll', handleNestedRecordScroll, nestedRecordScrollListenerOptions);
    window.addEventListener('resize', handlePanelResize);
    document.addEventListener('keydown', handleDocumentKeydown);

    const controller = {
      root,
      readOnly,
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!root.classList.contains('is-open')),
      refresh(nextRecords = currentRecords) {
        currentRecords = loadRecords(nextRecords, options);
        resetPendingDeleteConfirmation();
        renderRecordsView();
        return currentRecords.map(cloneRecord);
      },
      getRecords: () => currentRecords.map(cloneRecord),
      getDeletedRecords: () => getTrashRecords(currentRecords).map(cloneRecord),
      setAnnotationMarkerVisibility: (visible) => applyAnnotationMarkerVisibility(visible),
      getAnnotationMarkerVisibility: () => annotationMarkersVisible,
      destroy() {
        textStyleRegistration?.();
        window.clearTimeout(toastTimer);
        resetPendingDeleteConfirmation();
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('keydown', handleDocumentKeydown);
        window.removeEventListener('prototype-annotation-ready', handleAnnotationReady);
        root.removeEventListener('click', handleClick);
        root.removeEventListener('dblclick', handleDoubleClick);
        root.removeEventListener('input', handleFormInput);
        root.removeEventListener('submit', handleSubmit);
        root.removeEventListener('scroll', handleNestedRecordScroll, nestedRecordScrollListenerOptions);
        window.removeEventListener('resize', handlePanelResize);
        if (nestedRecordScrollEndTimer !== null) window.clearTimeout(nestedRecordScrollEndTimer);
        if (nestedRecordOcclusionFrame !== null) {
          if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(nestedRecordOcclusionFrame);
          else window.clearTimeout(nestedRecordOcclusionFrame);
          nestedRecordOcclusionFrame = null;
        }
        root.remove();
        if (mountedRoot === root) mountedRoot = null;
        delete root.__projectIterationPanelController;
      }
    };
    root.__projectIterationPanelController = controller;
    mountedRoot = root;
    return root;
  }

  window.ProjectIterationPanel = { mount };
})();
