(function () {
  let activeController = null;

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

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const deleteIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18"></path>
    </svg>`;

  function renderPlaceholder(annotation, instance = '', isEntry = false) {
    const baseId = annotation.id || `annotation-${annotation.number || 1}`;
    const id = instance ? `${baseId}-${instance}` : baseId;
    const placementClass = annotation.placement === 'right'
      ? ' is-right'
      : annotation.placement === 'left'
        ? ' is-left'
        : '';
    const entryClass = isEntry ? ' is-entry' : '';
    const scope = isEntry ? (annotation.entryScope || 'page') : (annotation.scope || 'page');
    const targetSelector = annotation.targetSelector || '';
    return `<span class="record-annotation-placeholder${placementClass}${entryClass}" data-annotation-placeholder="${escapeHtml(id)}" data-annotation-base="${escapeHtml(baseId)}" data-annotation-target="${escapeHtml(annotation.target || '')}" data-annotation-target-selector="${escapeHtml(targetSelector)}" data-annotation-scope="${escapeHtml(scope)}" data-annotation-position="${escapeHtml(annotation.anchorPosition || '')}" aria-hidden="true"></span>`;
  }

  function definitionMap(definitions) {
    const entries = definitions instanceof Map
      ? [...definitions.entries()]
      : (definitions || []).filter(Boolean).map((definition) => [
        definition.id || `annotation-${definition.number || 1}`,
        definition
      ]);
    return new Map(entries.map(([key, definition], index) => {
      const id = definition.id || key || `annotation-${index + 1}`;
      const legacyPosition = {};
      if (definition.markerPosition) legacyPosition.markerPosition = definition.markerPosition;
      if (definition.popoverPosition) legacyPosition.popoverPosition = definition.popoverPosition;
      let positionByScope = definition.positionByScope && typeof definition.positionByScope === 'object'
        ? { ...definition.positionByScope }
        : null;
      const legacyScope = definition.scope || 'page';
      if (Object.keys(legacyPosition).length) {
        positionByScope = {
          ...(positionByScope || {}),
          [legacyScope]: {
            ...legacyPosition,
            ...(positionByScope?.[legacyScope] || {})
          }
        };
      }
      return [id, {
        ...definition,
        number: String(index + 1),
        ...(positionByScope ? { positionByScope } : {})
      }];
    }));
  }

  function normaliseItems(definition) {
    const source = Array.isArray(definition.items)
      ? definition.items
      : String(definition.content || '').split(/\n+/);
    return source.map((item) => String(typeof item === 'object'
      ? (item?.text ?? item?.content ?? '')
      : item || '')
      .replace(/^\s*(?:\d+[、.．)]|[-•])\s*/, '')
      .trim()).filter(Boolean);
  }

  function getAnnotationItems(definition) {
    const source = Array.isArray(definition.items)
      ? definition.items
      : String(definition.content || '').split(/\n+/);
    return source.map((item) => String(typeof item === 'object'
        ? (item?.text ?? item?.content ?? '')
        : item || '')
        .replace(/^\s*(?:\d+[、.．)]|[-•])\s*/, '')
        .trim()).filter(Boolean);
  }

  function renderPopoverItems(definition) {
    const items = getAnnotationItems(definition);
    if (!items.length) return '';
    return `<ol class="record-annotation-popover-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
  }

  function getPageKey(root) {
    const pageElement = root.querySelector('.operations-page, .page-card') || root;
    const pathname = window.location.pathname.split('/').pop() || 'page.html';
    return `${pathname}::${pageElement.id || pageElement.getAttribute('aria-label') || 'page'}`;
  }

  function getCodeDefinitions(pageKey, data = window.PrototypeAnnotationData) {
    const pages = data?.pages;
    return Array.isArray(pages?.[pageKey]) ? pages[pageKey] : [];
  }

  function mergeDefinitions(baseDefinitions, codeDefinitions) {
    const codeEntries = (codeDefinitions || []).filter(Boolean);
    const deletedIds = new Set(codeEntries
      .filter((definition) => definition.deleted === true && definition.id)
      .map((definition) => definition.id));
    const merged = new Map();
    [...baseDefinitions, ...codeEntries.filter((definition) => definition.deleted !== true)].forEach((definition) => {
      const id = definition.id || `annotation-${definition.number || merged.size + 1}`;
      merged.set(id, { ...(merged.get(id) || {}), ...definition, id });
    });
    return [...merged.values()].filter((definition) => !deletedIds.has(definition.id));
  }

  function mount(root, definitions, options = {}) {
    if (!root) return { sync() {}, destroy() {} };
    if (root.__annotationOverlayController) return root.__annotationOverlayController;

    const overlay = document.createElement('div');
    overlay.className = 'record-annotation-overlay';
    const readOnly = resolveReadOnly(options);
    overlay.classList.toggle('is-readonly', readOnly);
    overlay.setAttribute('aria-label', '页面标注');
    document.body.appendChild(overlay);
    if (options.theme !== false) {
      if (options.theme && typeof options.theme.apply === 'function') options.theme.apply(overlay);
      else window.PrototypeToolsTheme?.apply(overlay);
    }

    const pageKey = options.pageKey || getPageKey(root);
    const baseDefinitions = definitions instanceof Map
      ? [...definitions.values()]
      : (definitions || options.definitions || []);
    const definitionById = definitionMap(mergeDefinitions(
      baseDefinitions,
      getCodeDefinitions(pageKey, options.data)
    ));
    const anchors = new Map();
    const drafts = new Map();
    const saveQueues = new Map();
    const placeholderCache = new Map();
    let draftSequence = 0;
    let annotationMode = false;
    let markersVisible = options.markersVisible !== false;
    let modeTransitioning = false;
    let modalOpen = false;
    let dragState = null;
    let suppressClickUntil = 0;
    let repositionFrame = null;
    let queuedRepositionOptions = null;
    let syncFrame = null;
    const modalTargetSelector = [
      '[role="dialog"]',
      '.operations-modal',
      '.bidding-dialog',
      '.lower-units-dialog',
      '.price-detail-dialog',
      '.processing-submit-dialog',
      '.review-modal-dialog',
      '.unit-modal-dialog'
    ].join(', ');
    const visibleModalSelector = [
      modalTargetSelector,
      '.operations-modal-backdrop',
      '.bidding-modal-mask.open',
      '.lower-units-modal.is-visible',
      '.qr-modal.is-visible'
    ].join(', ');

    const scheduleFrame = (callback) => typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame(callback)
      : window.setTimeout(callback, 16);
    const cancelScheduledFrame = (frame) => {
      if (frame === null) return;
      if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame);
      else window.clearTimeout(frame);
    };

    const isVisibleElement = (element) => {
      if (!element || element.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(element);
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getClientRects().length > 0;
    };

    const hasVisibleModal = () => [...root.querySelectorAll(
      visibleModalSelector
    )].some(isVisibleElement);

    const isModalTarget = (element) => Boolean(element?.closest?.(modalTargetSelector));

    const close = (anchor) => {
      anchor.classList.remove('is-open');
      anchor.style.zIndex = '10';
      anchor.querySelector('[data-annotation-toggle]')?.setAttribute('aria-expanded', 'false');
      const popover = anchor._recordAnnotationPopover;
      popover?.setAttribute('aria-hidden', 'true');
    };

    const closeAll = (except = null) => anchors.forEach((anchor) => {
      if (anchor !== except && anchor.classList.contains('is-open')) close(anchor);
    });

    const syncModalState = () => {
      const nextModalOpen = hasVisibleModal();
      if (nextModalOpen === modalOpen) return;
      modalOpen = nextModalOpen;
      if (modalOpen) closeAll();
      overlay.classList.toggle('is-modal-open', modalOpen);
    };

    const findPlaceholder = (id) => {
      const cached = placeholderCache.get(id);
      if (cached && cached.isConnected && root.contains(cached)) return cached;
      const placeholder = [...root.querySelectorAll('[data-annotation-placeholder]')]
        .find((candidate) => candidate.dataset.annotationPlaceholder === id);
      if (placeholder) placeholderCache.set(id, placeholder);
      return placeholder;
    };

    // Inline placeholders may carry an instance suffix (for example, `-column`),
    // while persisted custom definitions are keyed by their base annotation ID.
    // Match the base ID as a fallback so sync() does not create a second marker
    // for the same annotation target.
    const findPlaceholderForDefinition = (id) => {
      const exact = findPlaceholder(id);
      if (exact) return exact;
      return [...root.querySelectorAll('[data-annotation-placeholder]')]
        .find((candidate) => candidate.dataset.annotationBase === id);
    };

    const getDefinitionForAnchor = (anchor) => {
      const id = anchor?.dataset.annotationOverlayId;
      if (!id) return null;
      const direct = definitionById.get(id);
      if (direct) return direct;
      const placeholder = findPlaceholder(id);
      return definitionById.get(placeholder?.dataset.annotationBase) || null;
    };

    const syncAnnotationMarkerState = (anchor, definition = getDefinitionForAnchor(anchor)) => {
      if (!anchor) return;
      const muted = definition?.muted === true;
      anchor.classList.toggle('is-muted', muted);
      const marker = anchor.querySelector('[data-annotation-toggle]');
      if (!marker) return;
      marker.classList.toggle('is-muted', muted);
      const number = definition?.number || marker.textContent || '1';
      marker.setAttribute('aria-label', `${muted ? '查看历史迭代标注' : '查看标注'}${number}`);
    };

    const getAnnotationScope = (anchor) => {
      const placeholder = findPlaceholder(anchor?.dataset.annotationOverlayId);
      return placeholder?.dataset.annotationScope
        || anchor?.dataset.annotationScope
        || getDefinitionForAnchor(anchor)?.scope
        || 'page';
    };

    const getStoredPosition = (definition, scope = 'page') => {
      const positionByScope = definition?.positionByScope;
      if (positionByScope && Object.prototype.hasOwnProperty.call(positionByScope, scope)) {
        const scopedPosition = positionByScope[scope] || {};
        return {
          markerPosition: scopedPosition.markerPosition || definition.markerPosition,
          popoverPosition: scopedPosition.popoverPosition || definition.popoverPosition
        };
      }
      if (positionByScope) return {};
      return {
        markerPosition: definition?.markerPosition,
        popoverPosition: definition?.popoverPosition
      };
    };

    const getHorizontalScrollHost = (element) => {
      let node = element?.parentElement;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowX = style.overflowX;
        if (['auto', 'scroll', 'overlay'].includes(overflowX) && node.scrollWidth > node.clientWidth + 1) return node;
        node = node.parentElement;
      }
      return null;
    };

    const getPositionContext = (anchor) => {
      const placeholder = findPlaceholder(anchor.dataset.annotationOverlayId);
      const marker = anchor.querySelector('[data-annotation-toggle]');
      const popover = anchor._recordAnnotationPopover;
      if (!placeholder || !marker || !popover || !placeholder.getClientRects().length) return null;

      const placeholderRect = placeholder.getBoundingClientRect();
      const entryHost = placeholder.closest('.record-annotation-entry');
      const cornerHost = placeholder.closest('.record-annotation-corner');
      const modalHeader = placeholder.dataset.annotationPosition === 'modal-header-right'
        ? placeholder.closest('.operations-modal-header')
        : null;
      const scope = getAnnotationScope(anchor);
      const targetElement = placeholder.dataset.annotationTargetSelector
        ? root.querySelector(placeholder.dataset.annotationTargetSelector)
        : null;
      if (placeholder.dataset.annotationTarget === 'custom'
        && (!targetElement || !isVisibleElement(targetElement))) return null;
      if (scope === 'modal' && !hasVisibleModal()) return null;
      const entryTarget = placeholder.previousElementSibling || entryHost;
      const hostElement = targetElement || entryTarget || cornerHost || placeholder.parentElement;
      const hostRect = hostElement?.getBoundingClientRect() || placeholderRect;
      const isEntry = anchor.classList.contains('is-entry');
      const isRight = anchor.dataset.annotationPlacement === 'right';
      const isExportEntry = isEntry && anchor.dataset.annotationAction === 'export';
      const entryMarkerPosition = anchor.dataset.annotationEntryPosition || '';
      const queryButton = placeholder.dataset.annotationTarget === 'filter'
        ? root.querySelector('#recordQuery')
        : null;
      const queryRect = queryButton?.getBoundingClientRect();
      const modalHeaderRect = modalHeader?.getClientRects().length ? modalHeader.getBoundingClientRect() : null;
      const targetRect = targetElement?.getBoundingClientRect() || null;
      return {
        placeholder,
        marker,
        popover,
        placeholderRect,
        cornerHost,
        hostRect,
        modalHeaderRect,
        targetRect,
        horizontalScrollHost: getHorizontalScrollHost(targetElement),
        queryRect,
        referenceRect: modalHeaderRect || queryRect || targetRect || hostRect || placeholderRect,
        isEntry,
        isRight,
        isExportEntry,
        entryMarkerPosition,
        scope
      };
    };

    const getAutoPosition = (context) => {
      const {
        placeholderRect,
        cornerHost,
        targetRect,
        hostRect,
        modalHeaderRect,
        queryRect,
        isEntry,
        isRight,
        isExportEntry,
        entryMarkerPosition
      } = context;
      let markerLeft = placeholderRect.left;
      let markerTop = hostRect.top + ((hostRect.height - 22) / 2);

      if (modalHeaderRect) {
        markerLeft = modalHeaderRect.right - 22 - 44;
        markerTop = modalHeaderRect.top + ((modalHeaderRect.height - 22) / 2);
      } else if (queryRect && queryRect.width && queryRect.height) {
        markerLeft = isRight ? queryRect.right + 4 : queryRect.left - 26;
        markerTop = queryRect.top + ((queryRect.height - 22) / 2);
      } else if (targetRect && targetRect.width && targetRect.height) {
        markerLeft = isRight ? targetRect.right + 4 : targetRect.left - 26;
        markerTop = targetRect.top + ((targetRect.height - 22) / 2);
      } else if (isExportEntry && entryMarkerPosition === 'left') {
        markerLeft = hostRect.left - 26;
        markerTop = hostRect.top + ((hostRect.height - 22) / 2);
      } else if (isExportEntry) {
        markerLeft = hostRect.left + ((hostRect.width - 22) / 2);
        markerTop = hostRect.top - 28;
      } else if (isEntry) {
        markerLeft = isRight ? hostRect.right + 4 : hostRect.left - 26;
      } else if (cornerHost && isRight) {
        markerLeft = placeholderRect.right - 22;
      }
      if (!queryRect && !hostRect.height) markerTop = placeholderRect.top;
      return { left: markerLeft, top: markerTop };
    };

    const clampMarkerPosition = (left, top) => ({
      left: Math.max(8, Math.min(left, window.innerWidth - 30)),
      top: Math.max(8, Math.min(top, window.innerHeight - 30))
    });

    const clampPopoverPosition = (left, top, popover) => {
      const rect = popover.getBoundingClientRect();
      const width = Math.min(popover.offsetWidth || rect.width || 380, window.innerWidth - 32);
      const height = Math.min(popover.offsetHeight || rect.height || 0, window.innerHeight - 32);
      return {
        left: Math.max(16, Math.min(left, window.innerWidth - width - 16)),
        top: Math.max(16, Math.min(top, window.innerHeight - height - 16))
      };
    };

    const readPopoverPosition = (popover) => {
      const rect = popover?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0 || rect.right < -1000 || rect.bottom < -1000) return null;
      return { left: rect.left, top: rect.top };
    };

    const restorePopoverPosition = (popover, savedPosition) => {
      if (!popover || !savedPosition) return;
      const next = clampPopoverPosition(savedPosition.left, savedPosition.top, popover);
      popover.style.left = `${Math.round(next.left)}px`;
      popover.style.top = `${Math.round(next.top)}px`;
      popover.style.right = 'auto';
    };

    const positionPopover = (anchor, definition = getDefinitionForAnchor(anchor)) => {
      const marker = anchor.querySelector('[data-annotation-toggle]');
      const popover = anchor._recordAnnotationPopover;
      if (!marker || !popover) return;
      const markerRect = marker.getBoundingClientRect();
      const popoverWidth = Math.min(popover.offsetWidth || 340, window.innerWidth - 32);
      const popoverHeight = popover.offsetHeight || 0;
      const storedPosition = getStoredPosition(definition, getAnnotationScope(anchor)).popoverPosition;
      if (storedPosition && Number.isFinite(Number(storedPosition.x)) && Number.isFinite(Number(storedPosition.y))) {
        const storedLeft = markerRect.left + Number(storedPosition.x);
        const storedTop = markerRect.top + Number(storedPosition.y);
        popover.style.left = `${Math.round(Math.max(16, Math.min(storedLeft, window.innerWidth - popoverWidth - 16)))}px`;
        popover.style.top = `${Math.round(Math.max(16, Math.min(storedTop, window.innerHeight - popoverHeight - 16)))}px`;
        popover.style.right = 'auto';
        return;
      }
      const isRight = anchor.dataset.annotationPlacement === 'right';
      const isEntry = anchor.classList.contains('is-entry');
      const left = isRight && !isEntry ? markerRect.right - popoverWidth : markerRect.left;
      let top = markerRect.top - 8 - popoverHeight;
      if (top < 16) top = markerRect.bottom + 8;
      popover.style.left = `${Math.round(Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16)))}px`;
      popover.style.top = `${Math.round(Math.max(16, Math.min(top, window.innerHeight - popoverHeight - 16)))}px`;
      popover.style.right = 'auto';
    };

    const position = (anchor, { preserveHorizontal = false } = {}) => {
      const context = getPositionContext(anchor);
      if (!context) {
        anchor.hidden = true;
        anchor._recordAnnotationPopover?.setAttribute('aria-hidden', 'true');
        return;
      }
      anchor.hidden = false;
      const definition = getDefinitionForAnchor(anchor);
      const autoPosition = getAutoPosition(context);
      const storedPosition = getStoredPosition(definition, context.scope).markerPosition;
      const markerPosition = storedPosition
        && Number.isFinite(Number(storedPosition.x))
        && Number.isFinite(Number(storedPosition.y))
        ? {
          left: context.referenceRect.left + Number(storedPosition.x),
          top: context.referenceRect.top + Number(storedPosition.y)
        }
        : autoPosition;
      const currentLeft = Number.parseFloat(anchor.style.left);
      const left = preserveHorizontal && context.horizontalScrollHost && Number.isFinite(currentLeft)
        ? currentLeft
        : markerPosition.left;
      const next = clampMarkerPosition(left, markerPosition.top);
      anchor.style.left = `${Math.round(next.left)}px`;
      anchor.style.top = `${Math.round(next.top)}px`;
      anchor.style.zIndex = anchor.classList.contains('is-open') ? '20' : '10';
      positionPopover(anchor, definition);
    };

    const positionDraft = (draft) => {
      const targetRect = draft.target?.getBoundingClientRect();
      if (!targetRect || !targetRect.width && !targetRect.height) {
        draft.anchor.hidden = true;
        draft.popover.setAttribute('aria-hidden', 'true');
        return;
      }
      draft.anchor.hidden = false;
      const marker = draft.anchor.querySelector('[data-annotation-toggle]');
      const markerPosition = clampMarkerPosition(
        targetRect.right + 4,
        targetRect.top + ((targetRect.height - 22) / 2)
      );
      draft.anchor.style.left = `${Math.round(markerPosition.left)}px`;
      draft.anchor.style.top = `${Math.round(markerPosition.top)}px`;
      draft.anchor.style.zIndex = '30';
      const markerRect = marker.getBoundingClientRect();
      const popoverWidth = Math.min(draft.popover.offsetWidth || 380, window.innerWidth - 32);
      const popoverHeight = draft.popover.offsetHeight || 0;
      let left = markerRect.right + 8;
      if (left + popoverWidth > window.innerWidth - 16) left = markerRect.left - popoverWidth - 8;
      let top = markerRect.top - popoverHeight - 8;
      if (top < 16) top = markerRect.bottom + 8;
      draft.popover.style.left = `${Math.round(Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16)))}px`;
      draft.popover.style.top = `${Math.round(Math.max(16, Math.min(top, window.innerHeight - popoverHeight - 16)))}px`;
      draft.popover.style.right = 'auto';
      draft.popover.setAttribute('aria-hidden', 'false');
    };

    const reposition = (options = {}) => {
      anchors.forEach((anchor) => position(anchor, options));
      drafts.forEach(positionDraft);
    };

    const scheduleReposition = (options = {}) => {
      queuedRepositionOptions = { ...(queuedRepositionOptions || {}), ...options };
      if (repositionFrame !== null) return;
      repositionFrame = scheduleFrame(() => {
        repositionFrame = null;
        const nextOptions = queuedRepositionOptions || {};
        queuedRepositionOptions = null;
        reposition(nextOptions);
      });
    };

    const handleDocumentScroll = () => scheduleReposition({ preserveHorizontal: true });
    const handleResize = () => scheduleReposition();

    const escapeSelector = (value) => {
      if (window.CSS?.escape) return window.CSS.escape(String(value));
      return String(value).replace(/([\\"'#$%&()*+,./:;<=>?@[\\\]^`{|}~ ])/g, '\\$1');
    };

    const selectorValue = (value) => JSON.stringify(String(value));

    const buildTargetSelector = (element) => {
      if (!element || element === root || !root.contains(element)) return '';
      if (element.id) return `#${escapeSelector(element.id)}`;
      const stableAttributes = [
        'data-action',
        'data-toolbar-action',
        'data-filter',
        'data-row-action',
        'data-record-close',
        'data-operations-filter-toggle',
        'aria-label',
        'aria-labelledby'
      ];
      for (const attribute of stableAttributes) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        const selector = `[${attribute}=${selectorValue(value)}]`;
        if (root.querySelector(selector) === element) return selector;
      }
      const segments = [];
      let current = element;
      while (current && current !== root && current.nodeType === 1) {
        let segment = current.tagName.toLowerCase();
        const stableClass = [...(current.classList || [])]
          .find((className) => className && !/^(is-|has-|active|selected|open|disabled)/.test(className));
        if (stableClass) segment += `.${escapeSelector(stableClass)}`;
        const siblings = current.parentElement
          ? [...current.parentElement.children].filter((sibling) => sibling.tagName === current.tagName)
          : [];
        if (siblings.length > 1) segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        segments.unshift(segment);
        current = current.parentElement;
      }
      return segments.join(' > ');
    };

    const getElementName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelledText = labelledBy.split(/\s+/)
          .map((id) => root.querySelector(`#${escapeSelector(id)}`)?.textContent || '')
          .join(' ')
          .trim();
        if (labelledText) return labelledText;
      }
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel.trim();
      const id = element.getAttribute('id');
      const label = id ? root.querySelector(`label[for=${selectorValue(id)}]`) : null;
      if (label?.textContent.trim()) return label.textContent.trim();
      const parentLabel = element.closest('label');
      if (parentLabel?.textContent.trim()) return parentLabel.textContent.trim();
      const fieldLabel = element.closest('.operations-filter-item, .bidding-filter-item, .filter-item')?.querySelector('label');
      if (fieldLabel?.textContent.trim()) return fieldLabel.textContent.trim();
      if (element.tagName === 'SELECT') {
        const selected = element.selectedOptions?.[0]?.textContent?.trim();
        if (selected) return selected;
      }
      const text = element.textContent.replace(/\s+/g, ' ').trim();
      if (text) return text.slice(0, 80);
      const placeholder = element.getAttribute('placeholder');
      if (placeholder) return placeholder.trim();
      const dataLabel = element.dataset.action || element.dataset.filter || element.tagName.toLowerCase();
      const labelMap = {
        query: '查询',
        reset: '重置',
        export: '导出',
        'export-suppliers': '导出',
        add: '添加',
        'add-supplier': '添加供应商'
      };
      return labelMap[dataLabel] || dataLabel;
    };

    const findAnnotationTarget = (eventTarget) => {
      const target = eventTarget?.nodeType === 1 ? eventTarget : eventTarget?.parentElement;
      if (!target || !root.contains(target)) return null;
      const candidate = target.closest([
        'button',
        'input',
        'select',
        'textarea',
        'a',
        'th',
        'td',
        'label',
        '[role="button"]',
        '.operations-toolbar',
        '.operations-filter',
        '.bidding-toolbar',
        '.bidding-filter-panel',
        '.page-card',
        '[role="dialog"] h1',
        '[role="dialog"] h2',
        '[role="dialog"] h3',
        '[role="dialog"] h4',
        '[role="dialog"] p',
        '[role="dialog"] li',
        '[role="dialog"] dt',
        '[role="dialog"] dd',
        '[role="dialog"] > *',
        '.operations-modal > *',
        '.bidding-dialog > *',
        '.lower-units-dialog > *',
        '[role="dialog"]'
      ].join(', '));
      return candidate && root.contains(candidate) && candidate !== root ? candidate : null;
    };

    const parseDraftItems = (value) => String(value || '')
      .split(/\r?\n/)
      .map((item) => item.replace(/^\s*\d+\s*[、.．)]\s*/, '').trim())
      .filter(Boolean);

    const getNextBodyNumber = (value) => {
      const numbers = [...String(value || '').matchAll(/^\s*(\d+)\s*[、.．)]/gm)]
        .map((match) => Number(match[1]))
        .filter(Number.isFinite);
      return (numbers.length ? Math.max(...numbers) : 0) + 1;
    };

    const bindNumberedBodyInput = (bodyInput) => {
      bodyInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.isComposing) return;
        event.preventDefault();
        const start = bodyInput.selectionStart;
        const end = bodyInput.selectionEnd;
        const before = bodyInput.value.slice(0, start);
        const after = bodyInput.value.slice(end);
        const nextNumber = getNextBodyNumber(before);
        const prefix = before && !before.endsWith('\n') ? '\n' : '';
        const insertion = `${prefix}${nextNumber}. `;
        bodyInput.value = `${before}${insertion}${after}`;
        const cursor = before.length + insertion.length;
        bodyInput.setSelectionRange(cursor, cursor);
      });
    };

    const createCodePlaceholder = (definition) => {
      const placeholder = document.createElement('span');
      placeholder.className = `record-annotation-placeholder is-code${definition.placement === 'left' ? ' is-left' : ' is-right'}`;
      placeholder.dataset.annotationPlaceholder = definition.id;
      placeholder.dataset.annotationBase = definition.id;
      placeholder.dataset.annotationTarget = 'custom';
      placeholder.dataset.annotationTargetSelector = definition.targetSelector || '';
      placeholder.dataset.annotationScope = definition.scope || 'page';
      placeholder.setAttribute('aria-hidden', 'true');
      root.appendChild(placeholder);
      return placeholder;
    };

    const createAnnotation = (definition, placeholder) => {
      const id = placeholder.dataset.annotationPlaceholder;
      const number = escapeHtml(definition.number || '1');
      const title = escapeHtml(definition.title || `标注${number}`);
      const popoverActions = Array.isArray(definition.popoverActions)
        ? definition.popoverActions.filter((action) => action && action.key && action.label)
        : [];
      const actionsHtml = popoverActions.length
        ? `<div class="record-annotation-popover-actions">${popoverActions.map((action) => {
          const className = action.className || 'btn btn-sm record-annotation-action';
          return `<button class="${escapeHtml(className)}" type="button" data-annotation-popover-action="${escapeHtml(action.key)}">${escapeHtml(action.label)}</button>`;
        }).join('')}</div>`
        : '';
      const placementClass = definition.placement === 'right'
        ? ' is-right'
        : definition.placement === 'left'
          ? ' is-left'
          : '';
      const entryClass = placeholder.classList.contains('is-entry') ? ' is-entry' : '';
      const scope = placeholder.dataset.annotationScope || definition.scope || 'page';
      const anchor = document.createElement('span');
      anchor.className = `record-annotation-anchor${placementClass}${entryClass}`;
      anchor.dataset.annotationOverlayId = id;
      anchor.dataset.annotationBase = placeholder.dataset.annotationBase || id;
      anchor.dataset.annotationPlacement = definition.placement || '';
      anchor.dataset.annotationAction = definition.actionKey || '';
      anchor.dataset.annotationEntryPosition = definition.entryMarkerPosition || '';
      anchor.dataset.annotationScope = scope;
      anchor.innerHTML = `<button class="record-annotation-marker" type="button" data-annotation-toggle="${escapeHtml(id)}" aria-expanded="false" aria-label="查看标注${number}">${number}</button>`;
      syncAnnotationMarkerState(anchor, definition);

      const popover = document.createElement('div');
      popover.className = 'record-annotation-popover';
      popover.dataset.annotationPopover = id;
      popover.dataset.annotationScope = scope;
      popover.setAttribute('role', 'note');
      popover.setAttribute('aria-hidden', 'true');
      popover.innerHTML = `<strong class="record-annotation-popover-title">${title}</strong>${renderPopoverItems(definition)}${actionsHtml}`;
      popover._recordAnnotationDefinition = definition;
      anchor._recordAnnotationPopover = popover;
      return { anchor, popover };
    };

    const renderPopoverView = (definition) => {
      const number = escapeHtml(definition.number || '1');
      const title = escapeHtml(definition.title || `标注${number}`);
      const actions = Array.isArray(definition.popoverActions)
        ? definition.popoverActions.filter((action) => action && action.key && action.label)
        : [];
    const actionsHtml = actions.length
      ? `<div class="record-annotation-popover-actions">${actions.map((action) => `<button class="${escapeHtml(action.className || 'btn btn-sm record-annotation-action')}" type="button" data-annotation-popover-action="${escapeHtml(action.key)}">${escapeHtml(action.label)}</button>`).join('')}</div>`
      : '';
      return `<strong class="record-annotation-popover-title">${title}</strong>${renderPopoverItems(definition)}${actionsHtml}`;
    };

    const renumberDefinitions = () => {
      let nextNumber = 1;
      definitionById.forEach((definition, id) => {
        const number = String(nextNumber++);
        if (String(definition.number || '') === number) return;
        const next = { ...definition, number };
        definitionById.set(id, next);
        const anchor = anchors.get(id);
        const marker = anchor?.querySelector('[data-annotation-toggle]');
        if (marker) {
          marker.textContent = number;
          marker.setAttribute('aria-label', `查看标注${number}`);
        }
        syncAnnotationMarkerState(anchor, next);
        const popover = anchor?._recordAnnotationPopover;
        if (popover) {
          popover._recordAnnotationDefinition = next;
          if (!popover._recordAnnotationEditing) popover.innerHTML = renderPopoverView(next);
        }
      });
    };

    const renderPopoverEditor = (definition) => {
      const title = escapeHtml(definition.title || '');
      const body = normaliseItems(definition).map((item, index) => `${index + 1}. ${item}`).join('\n') || '1. ';
      const muted = definition.muted === true;
      return `<div class="record-annotation-edit-header"><strong class="record-annotation-popover-title record-annotation-edit-handle">编辑标注</strong><span class="record-annotation-delete-hint" data-annotation-delete-hint hidden>再次点击 × 删除标注</span><button class="record-annotation-muted-toggle${muted ? ' is-muted' : ''}" type="button" data-annotation-toggle-muted aria-pressed="${muted}" aria-label="${muted ? '取消标记为历史迭代标注' : '标记为历史迭代标注'}" title="${muted ? '取消置灰' : '置灰'}">${muted ? '取消置灰' : '置灰'}</button><button class="record-annotation-delete" type="button" data-annotation-delete aria-label="删除标注" title="删除标注">${deleteIcon}</button></div><label class="record-annotation-draft-field">标题<input class="record-annotation-draft-title" type="text" value="${title}"></label><label class="record-annotation-draft-field">正文<textarea class="record-annotation-draft-content" rows="5">${escapeHtml(body)}</textarea></label><div class="record-annotation-draft-error" hidden></div><div class="record-annotation-draft-actions"><button class="btn btn-primary btn-sm" type="button" data-annotation-save>保存</button><button class="btn btn-sm" type="button" data-annotation-cancel>取消</button></div>`;
    };

    const syncAnnotationMutedToggle = (popover, definition) => {
      const button = popover?.querySelector('[data-annotation-toggle-muted]');
      if (!button) return;
      const muted = definition?.muted === true;
      button.classList.toggle('is-muted', muted);
      button.setAttribute('aria-pressed', String(muted));
      button.setAttribute('aria-label', muted ? '取消标记为历史迭代标注' : '标记为历史迭代标注');
      button.title = muted ? '取消置灰' : '置灰';
      button.textContent = muted ? '取消置灰' : '置灰';
    };

    const setAnnotationError = (anchor, message) => {
      const error = anchor._recordAnnotationPopover?.querySelector('.record-annotation-draft-error');
      if (error) {
        error.textContent = message;
        error.hidden = !message;
      }
    };

    const openAnnotationEditor = (anchor) => {
      if (readOnly) return;
      const definition = getDefinitionForAnchor(anchor);
      const popover = anchor._recordAnnotationPopover;
      if (!definition || !popover) return;
      const savedPopoverPosition = readPopoverPosition(popover);
      closeAll(anchor);
      anchor.classList.add('is-open');
      anchor.querySelector('[data-annotation-toggle]')?.setAttribute('aria-expanded', 'true');
      popover.classList.add('is-editable');
      popover.setAttribute('aria-hidden', 'false');
      popover._recordAnnotationEditing = true;
      popover.innerHTML = renderPopoverEditor(definition);
      bindNumberedBodyInput(popover.querySelector('.record-annotation-draft-content'));
      position(anchor);
      const titleInput = popover.querySelector('.record-annotation-draft-title');
      titleInput?.focus();
      titleInput?.select();
      restorePopoverPosition(popover, savedPopoverPosition);
    };

    const showAnnotationEditor = (anchor) => {
      if (readOnly) return;
      const popover = anchor._recordAnnotationPopover;
      if (!popover?._recordAnnotationEditing) return;
      const savedPopoverPosition = readPopoverPosition(popover);
      closeAll(anchor);
      anchor.classList.add('is-open');
      anchor.querySelector('[data-annotation-toggle]')?.setAttribute('aria-expanded', 'true');
      popover.classList.add('is-editable');
      popover.setAttribute('aria-hidden', 'false');
      position(anchor);
      restorePopoverPosition(popover, savedPopoverPosition);
    };

    const cancelAnnotationEditor = (anchor) => {
      const definition = getDefinitionForAnchor(anchor);
      const popover = anchor._recordAnnotationPopover;
      if (!definition || !popover) return;
      const savedPopoverPosition = readPopoverPosition(popover);
      popover.classList.remove('is-editable');
      popover._recordAnnotationEditing = false;
      popover.innerHTML = renderPopoverView(definition);
      // 取消只丢弃当前输入，收尾状态与保存成功一致，恢复为普通气泡展示。
      anchor.classList.add('is-open');
      anchor.querySelector('[data-annotation-toggle]')?.setAttribute('aria-expanded', 'true');
      popover.setAttribute('aria-hidden', 'false');
      position(anchor);
      restorePopoverPosition(popover, savedPopoverPosition);
    };

    const saveAnnotationText = async (anchor) => {
      if (readOnly) return false;
      const definition = getDefinitionForAnchor(anchor);
      const popover = anchor._recordAnnotationPopover;
      if (!definition || !popover) return false;
      if (popover._recordAnnotationDeleting) return popover._recordAnnotationDeletePromise || false;
      if (popover._recordAnnotationSaving) return popover._recordAnnotationSavePromise || false;
      const titleInput = popover.querySelector('.record-annotation-draft-title');
      const bodyInput = popover.querySelector('.record-annotation-draft-content');
      const saveButton = popover.querySelector('[data-annotation-save]');
      const title = titleInput?.value.trim() || definition.title || `标注${definition.number || ''}`;
      const items = parseDraftItems(bodyInput?.value || '');
      if (!items.length) {
        setAnnotationError(anchor, '请填写正文内容');
        bodyInput?.focus();
        return false;
      }
      const next = { ...definition, items };
      next.title = title;
      popover._recordAnnotationSaving = true;
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = '保存中...';
      }
      setAnnotationError(anchor, '');
      const savePromise = (async () => {
        try {
          const saved = await persistDefinition(next);
          const savedDefinition = { ...next, ...(saved || {}) };
          if (Object.prototype.hasOwnProperty.call(next, 'muted')) savedDefinition.muted = next.muted === true;
          definitionById.set(savedDefinition.id, savedDefinition);
          notifyChange('update', savedDefinition);
          popover._recordAnnotationDefinition = savedDefinition;
          syncAnnotationMarkerState(anchor, savedDefinition);
          const savedPopoverPosition = readPopoverPosition(popover);
          // 正文保存会携带当前最新位置，覆盖此前可能失败的单独位置写入。
          anchor._recordAnnotationPositionPromise = Promise.resolve();
          popover.classList.remove('is-editable');
          popover._recordAnnotationEditing = false;
          popover.innerHTML = renderPopoverView(savedDefinition);
          anchor.classList.add('is-open');
          popover.setAttribute('aria-hidden', 'false');
          position(anchor);
          restorePopoverPosition(popover, savedPopoverPosition);
          return true;
        } catch (error) {
          if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = '保存';
          }
          setAnnotationError(anchor, '无法写入项目代码，请先启动项目代码保存服务');
          return false;
        } finally {
          popover._recordAnnotationSaving = false;
          popover._recordAnnotationSavePromise = null;
        }
      })();
      popover._recordAnnotationSavePromise = savePromise;
      return savePromise;
    };

    const toggleAnnotationMuted = async (anchor) => {
      if (readOnly) return false;
      const definition = getDefinitionForAnchor(anchor);
      const popover = anchor?._recordAnnotationPopover;
      const button = popover?.querySelector('[data-annotation-toggle-muted]');
      if (!definition || !popover || !button || popover._recordAnnotationSaving || popover._recordAnnotationDeleting) return false;
      const next = { ...definition, muted: definition.muted !== true };
      button.disabled = true;
      button.textContent = '保存中...';
      setAnnotationError(anchor, '');
      try {
        const saved = await persistDefinition(next);
        const savedDefinition = { ...next, ...(saved || {}), muted: next.muted };
        definitionById.set(savedDefinition.id, savedDefinition);
        popover._recordAnnotationDefinition = savedDefinition;
        syncAnnotationMarkerState(anchor, savedDefinition);
        syncAnnotationMutedToggle(popover, savedDefinition);
        notifyChange('update', savedDefinition);
        return true;
      } catch (error) {
        setAnnotationError(anchor, '无法保存标注状态，请检查项目代码保存服务');
        return false;
      } finally {
        if (button.isConnected) {
          button.disabled = false;
          syncAnnotationMutedToggle(popover, getDefinitionForAnchor(anchor));
        }
      }
    };

    const deleteAnnotation = async (anchor) => {
      if (readOnly) return false;
      const definition = getDefinitionForAnchor(anchor);
      const popover = anchor._recordAnnotationPopover;
      if (!definition || !popover) return false;
      if (popover._recordAnnotationDeleting) return popover._recordAnnotationDeletePromise || false;
      if (popover._recordAnnotationSaving) return false;
      const deleteButton = popover.querySelector('[data-annotation-delete]');
      if (!deleteButton) return false;
      if (deleteButton.dataset.deleteArmed !== 'true') {
        deleteButton.dataset.deleteArmed = 'true';
        deleteButton.classList.add('is-delete-armed');
        popover.classList.add('is-delete-armed');
        deleteButton.setAttribute('aria-label', '再次点击删除标注');
        deleteButton.setAttribute('title', '再次点击直接删除');
        popover.querySelector('[data-annotation-delete-hint]')?.removeAttribute('hidden');
        return false;
      }
      popover._recordAnnotationDeleting = true;
      if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.textContent = '…';
        deleteButton.setAttribute('aria-label', '正在删除标注');
      }
      setAnnotationError(anchor, '');
      const deletePromise = (async () => {
        try {
          await persistDefinition({ ...definition, deleted: true });
          definitionById.delete(definition.id);
          notifyChange('delete', { ...definition, deleted: true });
          renumberDefinitions();
          sync();
          return true;
        } catch (error) {
          if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = deleteIcon;
            deleteButton.setAttribute('aria-label', '再次点击删除标注');
            deleteButton.setAttribute('title', '再次点击直接删除');
          }
          setAnnotationError(anchor, '无法删除项目代码中的标注，请检查项目代码保存服务');
          return false;
        } finally {
          popover._recordAnnotationDeleting = false;
          popover._recordAnnotationDeletePromise = null;
        }
      })();
      popover._recordAnnotationDeletePromise = deletePromise;
      return deletePromise;
    };

    const saveAnnotationPosition = (anchor, positionPatch) => {
      if (readOnly) return;
      const definition = getDefinitionForAnchor(anchor);
      if (!definition) return;
      const scope = getAnnotationScope(anchor);
      const currentPosition = getStoredPosition(definition, scope);
      const next = {
        ...definition,
        positionByScope: {
          ...(definition.positionByScope || {}),
          [scope]: {
            ...currentPosition,
            ...positionPatch
          }
        }
      };
      definitionById.set(next.id, next);
      anchor._recordAnnotationPopover._recordAnnotationDefinition = next;
      const positionPromise = persistDefinition(next);
      anchor._recordAnnotationPositionPromise = positionPromise;
      positionPromise.then(() => notifyChange('position', next), () => {});
      positionPromise.catch(() => {
        setAnnotationError(anchor, '位置已在当前页面更新，但写入项目代码失败');
      });
      return positionPromise;
    };

    const sync = () => {
      placeholderCache.clear();
      // 页面刷新后，项目代码中的自定义标注没有业务模板占位点，需要按持久化定位选择器补回占位点。
      definitionById.forEach((definition, id) => {
        if (definition.target !== 'custom' || !definition.targetSelector || findPlaceholderForDefinition(id)) return;
        createCodePlaceholder({ ...definition, id });
      });
      renumberDefinitions();
      const activeIds = new Set();
      [...root.querySelectorAll('[data-annotation-placeholder]')].forEach((placeholder) => {
        const id = placeholder.dataset.annotationPlaceholder;
        const definition = definitionById.get(placeholder.dataset.annotationBase);
        if (!id || !definition) return;
        activeIds.add(id);
        if (anchors.has(id)) {
          syncAnnotationMarkerState(anchors.get(id), definition);
          return;
        }
        const annotation = createAnnotation(definition, placeholder);
        anchors.set(id, annotation.anchor);
        overlay.appendChild(annotation.anchor);
        overlay.appendChild(annotation.popover);
      });
      [...anchors.entries()].forEach(([id, anchor]) => {
        if (activeIds.has(id)) return;
        close(anchor);
        anchor._recordAnnotationPopover?.remove();
        anchor.remove();
        anchors.delete(id);
      });
      syncModalState();
      reposition();
    };

    const scheduleSync = () => {
      if (syncFrame !== null) return;
      syncFrame = scheduleFrame(() => {
        syncFrame = null;
        sync();
      });
    };

    const setDraftError = (draft, message) => {
      draft.error.textContent = message;
      draft.error.hidden = !message;
    };

    const removeDraft = (draft) => {
      draft.anchor.remove();
      draft.popover.remove();
      drafts.delete(draft.id);
    };

    const cancelDrafts = () => [...drafts.values()].forEach(removeDraft);

    const notifyChange = (type, definition) => {
      if (typeof options.onChange !== 'function') return;
      try {
        options.onChange({ type, pageKey, definition });
      } catch (error) {
        // 宿主的变更通知不应阻断标注本身的保存流程。
      }
    };

    const saveDefinitionToProjectCode = async (definition) => {
      const context = {
        kind: 'annotation',
        projectId: options.projectId || 'default',
        pageId: pageKey,
        pageKey,
        definition
      };
      if (typeof options.saveDefinition === 'function') {
        return options.saveDefinition(context);
      }
      if (typeof options.storage?.save === 'function') {
        return options.storage.save(context, definition);
      }
      if (typeof window.AnnotationOverlayProjectWriter === 'function') {
        return window.AnnotationOverlayProjectWriter({ pageKey, definition });
      }
      const configuredEndpoint = window.AnnotationOverlayConfig?.saveEndpoint;
      const endpoint = configuredEndpoint || (window.location.protocol === 'file:'
        ? 'http://127.0.0.1:4173/__annotation-code-save'
        : '/__annotation-code-save');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey, definition })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      return result.definition || definition;
    };

    const persistDefinition = (definition) => {
      const id = definition.id;
      const previous = saveQueues.get(id) || Promise.resolve();
      const queued = previous
        .catch(() => null)
        .then(() => saveDefinitionToProjectCode(definition));
      saveQueues.set(id, queued);
      const clearQueue = () => {
        if (saveQueues.get(id) === queued) saveQueues.delete(id);
      };
      queued.then(clearQueue, clearQueue);
      return queued;
    };

    const saveDraft = async (draft) => {
      if (draft.saving) return draft.savePromise || false;
      const title = draft.titleInput.value.trim() || getElementName(draft.target);
      const items = parseDraftItems(draft.bodyInput.value);
      const targetSelector = buildTargetSelector(draft.target);
      if (!items.length) {
        setDraftError(draft, '请填写正文内容');
        draft.bodyInput.focus();
        return false;
      }
      if (!targetSelector) {
        setDraftError(draft, '当前元素无法保存定位，请重新创建标注');
        return false;
      }

      const definition = {
        id: `custom-${Date.now()}-${draft.id.replace(/\D/g, '') || '1'}`,
        target: 'custom',
        targetSelector,
        placement: 'right',
        scope: isModalTarget(draft.target) ? 'modal' : 'page',
        title,
        items
      };
      draft.saving = true;
      draft.saveButton.disabled = true;
      draft.saveButton.textContent = '保存中...';
      setDraftError(draft, '');
      const savePromise = (async () => {
        try {
          const saved = await persistDefinition(definition);
          const savedDefinition = { ...definition, ...(saved || {}) };
          definitionById.set(savedDefinition.id, savedDefinition);
          notifyChange('create', savedDefinition);
          renumberDefinitions();
          createCodePlaceholder(definitionById.get(savedDefinition.id));
          removeDraft(draft);
          sync();
          return true;
        } catch (error) {
          draft.saveButton.disabled = false;
          draft.saveButton.textContent = '保存';
          setDraftError(draft, '当前为静态 file 页面，无法直接写入项目代码；请先启动项目代码保存服务');
          return false;
        } finally {
          draft.saving = false;
          draft.savePromise = null;
        }
      })();
      draft.savePromise = savePromise;
      return savePromise;
    };

    const createDraft = (target) => {
      if (readOnly || !annotationMode || !markersVisible || !target) return;
      closeAll();
      const id = `draft-${++draftSequence}`;
      const number = definitionById.size + drafts.size + 1;
      const elementName = getElementName(target);
      const anchor = document.createElement('span');
      anchor.className = 'record-annotation-anchor is-right is-open is-draft';
      anchor.dataset.annotationOverlayId = id;
      anchor.innerHTML = `<button class="record-annotation-marker" type="button" data-annotation-toggle="${id}" aria-expanded="true" aria-label="新建标注${number}">${number}</button>`;

      const popover = document.createElement('div');
      popover.className = 'record-annotation-popover record-annotation-draft-popover';
      popover.dataset.annotationDraft = id;
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-label', '编辑新建标注');
      popover.innerHTML = `<strong class="record-annotation-popover-title">新建标注</strong><label class="record-annotation-draft-field">标题<input class="record-annotation-draft-title" type="text"></label><label class="record-annotation-draft-field">正文<textarea class="record-annotation-draft-content" rows="5">1. </textarea></label><div class="record-annotation-draft-error" hidden></div><div class="record-annotation-draft-actions"><button class="btn btn-primary btn-sm" type="button" data-draft-save="${id}">保存</button><button class="btn btn-sm" type="button" data-draft-cancel="${id}">取消</button></div>`;
      const titleInput = popover.querySelector('.record-annotation-draft-title');
      const bodyInput = popover.querySelector('.record-annotation-draft-content');
      const draft = {
        id,
        number,
        target,
        anchor,
        popover,
        titleInput,
        bodyInput,
        saveButton: popover.querySelector(`[data-draft-save="${id}"]`),
        error: popover.querySelector('.record-annotation-draft-error'),
        saving: false
      };
      titleInput.value = elementName;
      bindNumberedBodyInput(bodyInput);
      drafts.set(id, draft);
      overlay.appendChild(anchor);
      overlay.appendChild(popover);
      positionDraft(draft);
      titleInput.focus();
      titleInput.select();
    };

    const editor = document.createElement('div');
    editor.className = 'record-annotation-editor';
    editor.innerHTML = '<button class="record-annotation-mode-toggle" type="button" aria-pressed="false" aria-label="进入标注模式" data-annotation-tooltip="进入标注模式；双击页面元素创建标注">标注模式</button><span class="record-annotation-editor-hint" hidden>双击页面元素创建标注</span>';
    const modeToggle = editor.querySelector('.record-annotation-mode-toggle');
    const modeHint = editor.querySelector('.record-annotation-editor-hint');
    const setModeTooltip = (text) => {
      modeToggle.setAttribute('data-annotation-tooltip', text);
      modeToggle.removeAttribute('title');
    };
    overlay.appendChild(editor);

    const setMarkerVisibility = (visible) => {
      markersVisible = Boolean(visible);
      overlay.classList.toggle('is-markers-hidden', !markersVisible);
      editor.hidden = readOnly || !markersVisible;
      modeToggle.hidden = readOnly || !markersVisible;
      if (!markersVisible) {
        closeAll();
        if (annotationMode && !modeTransitioning) exitAnnotationMode();
      } else {
        reposition();
      }
      if (!modeTransitioning) modeToggle.disabled = !markersVisible && !annotationMode;
      return markersVisible;
    };

    const savePendingAnnotationChanges = async () => {
      const editingAnchors = [...anchors.values()]
        .filter((anchor) => anchor._recordAnnotationPopover?._recordAnnotationEditing);
      const pendingDrafts = [...drafts.values()];
      const editResults = await Promise.allSettled([
        ...editingAnchors.map((anchor) => saveAnnotationText(anchor)),
        ...pendingDrafts.map((draft) => saveDraft(draft))
      ]);
      const editsSaved = editResults.every((result) => result.status === 'fulfilled' && result.value === true);
      const positionPromises = [...anchors.values()]
        .map((anchor) => anchor._recordAnnotationPositionPromise)
        .filter(Boolean);
      const positionResults = await Promise.allSettled(positionPromises);
      return editsSaved && positionResults.every((result) => result.status === 'fulfilled');
    };

    const exitAnnotationMode = async () => {
      if (modeTransitioning || !annotationMode) return;
      modeTransitioning = true;
      modeToggle.disabled = true;
      modeToggle.textContent = '保存中...';
      modeToggle.setAttribute('aria-label', '正在保存标注更改');
      setModeTooltip('正在保存标注更改');
      modeHint.hidden = false;
      modeHint.textContent = '正在保存标注更改...';
      let saved = false;
      try {
        saved = await savePendingAnnotationChanges();
      } catch (error) {
        saved = false;
      }
      if (!saved) {
        modeToggle.disabled = false;
        modeToggle.textContent = '退出标注模式';
        modeToggle.setAttribute('aria-label', '退出标注模式');
        setModeTooltip('');
        modeHint.textContent = '保存失败，请检查标注内容或项目代码保存服务';
        modeTransitioning = false;
        return;
      }
      annotationMode = false;
      overlay.classList.remove('is-editing');
      modeToggle.textContent = '标注模式';
      modeToggle.setAttribute('aria-label', '进入标注模式');
      setModeTooltip('进入标注模式；双击页面元素创建标注');
      modeToggle.setAttribute('aria-pressed', 'false');
      modeToggle.disabled = false;
      modeHint.hidden = true;
      modeHint.textContent = '双击页面元素创建标注';
      dragState = null;
      cancelDrafts();
      anchors.forEach((anchor) => {
        if (anchor._recordAnnotationPopover?._recordAnnotationEditing) cancelAnnotationEditor(anchor);
      });
      closeAll();
      modeTransitioning = false;
    };

    const setAnnotationMode = (enabled) => {
      if (readOnly || modeTransitioning) return;
      const nextMode = Boolean(enabled);
      if (nextMode && !markersVisible) return;
      if (nextMode === annotationMode) return;
      if (!nextMode) {
        exitAnnotationMode();
        return;
      }
      annotationMode = true;
      overlay.classList.toggle('is-editing', annotationMode);
      modeToggle.textContent = annotationMode ? '退出标注模式' : '标注模式';
      modeToggle.setAttribute('aria-label', annotationMode ? '退出标注模式' : '进入标注模式');
      setModeTooltip(annotationMode ? '' : '进入标注模式；双击页面元素创建标注');
      modeToggle.setAttribute('aria-pressed', String(annotationMode));
      modeHint.hidden = !annotationMode;
      modeHint.textContent = '双击页面元素创建标注';
      const openAnchor = [...anchors.values()].find((anchor) => anchor.classList.contains('is-open'));
      if (openAnchor && !openAnchor._recordAnnotationPopover?._recordAnnotationEditing) {
        openAnnotationEditor(openAnchor);
      }
    };

    const handleEditorClick = (event) => {
      const modeButton = event.target.closest?.('.record-annotation-mode-toggle');
      if (!modeButton) return;
      setAnnotationMode(!annotationMode);
      event.preventDefault();
      event.stopPropagation();
    };
    editor.addEventListener('click', handleEditorClick);

    const getExistingAnchorFromTarget = (target) => {
      const directAnchor = target.closest?.('.record-annotation-anchor');
      if (directAnchor && anchors.has(directAnchor.dataset.annotationOverlayId)) return directAnchor;
      const popover = target.closest?.('.record-annotation-popover');
      return popover ? anchors.get(popover.dataset.annotationPopover) || null : null;
    };

    const handleClick = (event) => {
      const saveButton = event.target.closest?.('[data-draft-save]');
      if (saveButton) {
        const draft = drafts.get(saveButton.dataset.draftSave);
        if (draft) saveDraft(draft);
        event.stopPropagation();
        return;
      }
      const cancelButton = event.target.closest?.('[data-draft-cancel]');
      if (cancelButton) {
        const draft = drafts.get(cancelButton.dataset.draftCancel);
        if (draft) removeDraft(draft);
        event.stopPropagation();
        return;
      }
      const annotationSave = event.target.closest?.('[data-annotation-save]');
      if (annotationSave) {
        const popover = annotationSave.closest('.record-annotation-popover');
        const anchor = anchors.get(popover?.dataset.annotationPopover);
        if (anchor) saveAnnotationText(anchor);
        event.stopPropagation();
        return;
      }
      const annotationCancel = event.target.closest?.('[data-annotation-cancel]');
      if (annotationCancel) {
        const popover = annotationCancel.closest('.record-annotation-popover');
        const anchor = anchors.get(popover?.dataset.annotationPopover);
        if (anchor) cancelAnnotationEditor(anchor);
        event.stopPropagation();
        return;
      }
      const annotationDelete = event.target.closest?.('[data-annotation-delete]');
      if (annotationDelete) {
        const popover = annotationDelete.closest('.record-annotation-popover');
        const anchor = anchors.get(popover?.dataset.annotationPopover);
        if (anchor) deleteAnnotation(anchor);
        event.stopPropagation();
        return;
      }
      const annotationMutedToggle = event.target.closest?.('[data-annotation-toggle-muted]');
      if (annotationMutedToggle) {
        const popover = annotationMutedToggle.closest('.record-annotation-popover');
        const anchor = anchors.get(popover?.dataset.annotationPopover);
        if (anchor) toggleAnnotationMuted(anchor);
        event.stopPropagation();
        return;
      }
      const existingPopover = event.target.closest?.('.record-annotation-popover');
      if (annotationMode && existingPopover && !existingPopover._recordAnnotationEditing) {
        const anchor = anchors.get(existingPopover.dataset.annotationPopover);
        if (anchor) {
          openAnnotationEditor(anchor);
          event.stopPropagation();
          return;
        }
      }
      const popoverAction = event.target.closest?.('[data-annotation-popover-action]');
      if (popoverAction) {
        const popover = popoverAction.closest('.record-annotation-popover');
        const handler = popover?._recordAnnotationDefinition?.onAction;
        if (typeof handler === 'function') handler({ key: popoverAction.dataset.annotationPopoverAction, event, popover });
        event.stopPropagation();
        return;
      }
      const toggle = event.target.closest?.('[data-annotation-toggle]');
      if (!toggle || toggle.closest('.is-draft')) return;
      const anchor = toggle.closest('.record-annotation-anchor');
      if (!anchor) return;
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        return;
      }
      if (annotationMode) {
        if (anchor._recordAnnotationPopover?._recordAnnotationEditing) showAnnotationEditor(anchor);
        else openAnnotationEditor(anchor);
        event.stopPropagation();
        return;
      }
      const expanded = !anchor.classList.contains('is-open');
      closeAll(anchor);
      anchor.classList.toggle('is-open', expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      anchor._recordAnnotationPopover?.setAttribute('aria-hidden', String(!expanded));
      if (expanded) position(anchor);
    };

    const handleDoubleClick = (event) => {
      if (readOnly || !annotationMode || event.target.closest?.('.record-annotation-overlay')) return;
      const target = findAnnotationTarget(event.target);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      createDraft(target);
    };

    const handlePointerDown = (event) => {
      if (readOnly || !annotationMode || event.button !== 0) return;
      const popover = event.target.closest?.('.record-annotation-popover');
      if (popover && !event.target.closest?.('input, textarea, select, button, [data-annotation-popover-action]')) {
        const anchor = anchors.get(popover.dataset.annotationPopover);
        if (!anchor || anchor.hidden || !popover.getClientRects().length) return;
        const rect = popover.getBoundingClientRect();
        dragState = {
          type: 'popover',
          anchor,
          popover,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startLeft: rect.left,
          startTop: rect.top,
          moved: false
        };
        anchor.classList.add('is-dragging');
        popover.classList.add('is-dragging');
        popover.setPointerCapture?.(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const marker = event.target.closest?.('[data-annotation-toggle]');
      const anchor = marker?.closest('.record-annotation-anchor');
      if (!marker || !anchor || anchor.classList.contains('is-draft') || anchor.hidden) return;
      const context = getPositionContext(anchor);
      if (!context) return;
      const rect = marker.getBoundingClientRect();
      dragState = {
        type: 'marker',
        anchor,
        marker,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top,
        moved: false
      };
      anchor.classList.add('is-dragging');
      marker.setPointerCapture?.(event.pointerId);
      event.stopPropagation();
    };

    const handlePointerMove = (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) dragState.moved = true;
      if (dragState.type === 'popover') {
        const next = clampPopoverPosition(
          dragState.startLeft + deltaX,
          dragState.startTop + deltaY,
          dragState.popover
        );
        dragState.popover.style.left = `${Math.round(next.left)}px`;
        dragState.popover.style.top = `${Math.round(next.top)}px`;
        dragState.popover.style.right = 'auto';
      } else {
        const next = clampMarkerPosition(dragState.startLeft + deltaX, dragState.startTop + deltaY);
        dragState.anchor.style.left = `${Math.round(next.left)}px`;
        dragState.anchor.style.top = `${Math.round(next.top)}px`;
        positionPopover(dragState.anchor);
      }
      event.preventDefault();
    };

    const handlePointerUp = (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      const current = dragState;
      if (current.moved) {
        const context = getPositionContext(current.anchor);
        const marker = current.anchor.querySelector('[data-annotation-toggle]');
        if (context && marker) {
          const markerRect = marker.getBoundingClientRect();
          if (current.type === 'popover') {
            const popoverRect = current.popover.getBoundingClientRect();
            saveAnnotationPosition(current.anchor, {
              popoverPosition: {
                x: Math.round(popoverRect.left - markerRect.left),
                y: Math.round(popoverRect.top - markerRect.top)
              }
            });
          } else {
            saveAnnotationPosition(current.anchor, {
              markerPosition: {
                x: Math.round(markerRect.left - context.referenceRect.left),
                y: Math.round(markerRect.top - context.referenceRect.top)
              }
            });
          }
        }
      }
      current.anchor.classList.remove('is-dragging');
      current.popover?.classList.remove('is-dragging');
      (current.marker || current.popover)?.releasePointerCapture?.(event.pointerId);
      suppressClickUntil = current.moved ? Date.now() + 150 : 0;
      dragState = null;
      if (current.moved) event.preventDefault();
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape' && annotationMode) setAnnotationMode(false);
      else if (event.key === 'Escape') closeAll();
    };

    const handleDocumentClick = (event) => {
      if (!event.target.closest?.('.record-annotation-anchor, .record-annotation-popover, .record-annotation-editor')) closeAll();
    };

    overlay.addEventListener('click', handleClick);
    overlay.addEventListener('pointerdown', handlePointerDown);
    overlay.addEventListener('pointermove', handlePointerMove);
    overlay.addEventListener('pointerup', handlePointerUp);
    overlay.addEventListener('pointercancel', handlePointerUp);
    overlay.addEventListener('keydown', handleKeydown);
    document.addEventListener('dblclick', handleDoubleClick, true);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('scroll', handleDocumentScroll, true);
    window.addEventListener('resize', handleResize);
    const modalObserver = new MutationObserver(scheduleSync);
    modalObserver.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-hidden', 'style'] });

    const attachModeControl = (target) => {
      if (readOnly) return false;
      const host = target?.querySelector?.('[data-project-iteration-annotation-mode-host]');
      if (!host) return false;
      host.appendChild(editor);
      editor.classList.add('is-docked');
      return true;
    };

    if (!markersVisible) setMarkerVisibility(false);

    const controller = {
      pageKey,
      readOnly,
      sync,
      setAnnotationMode,
      setMarkerVisibility,
      getMarkerVisibility: () => markersVisible,
      attachModeControl,
      getDefinitions: () => [...definitionById.values()].map((definition) => ({ ...definition })),
      destroy() {
        textStyleRegistration?.();
        overlay.removeEventListener('click', handleClick);
        overlay.removeEventListener('pointerdown', handlePointerDown);
        overlay.removeEventListener('pointermove', handlePointerMove);
        overlay.removeEventListener('pointerup', handlePointerUp);
        overlay.removeEventListener('pointercancel', handlePointerUp);
        overlay.removeEventListener('keydown', handleKeydown);
        editor.removeEventListener('click', handleEditorClick);
        document.removeEventListener('dblclick', handleDoubleClick, true);
        document.removeEventListener('click', handleDocumentClick);
        document.removeEventListener('scroll', handleDocumentScroll, true);
        window.removeEventListener('resize', handleResize);
        cancelScheduledFrame(repositionFrame);
        cancelScheduledFrame(syncFrame);
        repositionFrame = null;
        syncFrame = null;
        queuedRepositionOptions = null;
        modalObserver.disconnect();
        cancelDrafts();
        anchors.forEach((anchor) => anchor._recordAnnotationPopover?.remove());
        editor.remove();
        overlay.remove();
        if (activeController === controller) activeController = null;
        delete root.__annotationOverlayController;
      }
    };
    activeController = controller;
    root.__annotationOverlayController = controller;
    controller.sync();
    window.dispatchEvent(new CustomEvent('prototype-annotation-ready', { detail: { controller } }));
    return controller;
  }

  window.AnnotationOverlay = {
    renderPlaceholder,
    mount,
    attachModeControl: (target) => activeController?.attachModeControl?.(target) || false,
    setMarkerVisibility: (visible) => activeController?.setMarkerVisibility?.(visible) ?? false,
    getMarkerVisibility: () => activeController?.getMarkerVisibility?.() ?? true
  };
})();
