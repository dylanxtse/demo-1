/*
 * Prototype Tools unified entry point.
 *
 * The bundle deliberately exposes a small host-facing API while keeping the
 * annotation and iteration engines replaceable behind adapters.
 */
(function (global) {
  const version = '0.2.1';
  const scriptPromises = new Map();
  const documentRef = global.document;
  const packageScriptUrl = documentRef?.currentScript?.src || '';
  const getDocumentBaseUri = () => documentRef?.baseURI || global.location?.href || 'http://localhost/';

  function resolveRoot(root) {
    if (typeof root === 'string') return documentRef?.querySelector(root) || null;
    return root?.nodeType === 1 ? root : documentRef?.body || null;
  }

  function mount(config = {}) {
    const host = resolveRoot(config.root);
    if (!host) throw new Error('PrototypeTools.mount 找不到可用的挂载节点');
    if (host.__prototypeToolsInstance) return host.__prototypeToolsInstance;

    const annotationConfig = config.annotation === false
      ? null
      : {
        ...(typeof config.annotation === 'object' ? config.annotation : {}),
        root: config.root || host,
        theme: config.annotation?.theme ?? config.theme
      };
    const configuredMarkerVisibility = typeof config.iteration?.annotationMarkersVisible === 'boolean'
      ? config.iteration.annotationMarkersVisible
      : typeof config.annotation?.markersVisible === 'boolean'
        ? config.annotation.markersVisible
        : undefined;
    const iterationConfig = config.iteration === false
      ? null
      : {
        ...(typeof config.iteration === 'object' ? config.iteration : {}),
        host: config.iteration?.host || undefined,
        theme: config.iteration?.theme ?? config.theme,
        ...(typeof configuredMarkerVisibility === 'boolean'
          ? { annotationMarkersVisible: configuredMarkerVisibility }
          : {})
      };

    if (annotationConfig && !global.PrototypeToolsAnnotation?.mount) {
      throw new Error('PrototypeTools.mount 缺少 annotation.js，请先加载工具包资源');
    }
    if (iterationConfig && !global.PrototypeToolsIteration?.mount) {
      throw new Error('PrototypeTools.mount 缺少 iteration.js，请先加载工具包资源');
    }
    let annotation = null;
    let iteration = null;
    try {
      annotation = annotationConfig && global.PrototypeToolsAnnotation?.mount(annotationConfig);
      iteration = iterationConfig && global.PrototypeToolsIteration?.mount(iterationConfig);
    } catch (error) {
      annotation?.destroy?.();
      iteration?.destroy?.();
      throw error;
    }
    const instance = {
      version,
      root: host,
      annotation,
      iteration,
      setAnnotationMode(enabled) {
        return annotation?.setAnnotationMode?.(enabled);
      },
      openIteration() {
        return iteration?.open?.();
      },
      closeIteration() {
        return iteration?.close?.();
      },
      refresh() {
        annotation?.sync?.();
        iteration?.refresh?.();
        global.PrototypeToolsTheme?.refresh?.();
        return instance;
      },
      destroy() {
        annotation?.destroy?.();
        iteration?.destroy?.();
        if (host.__prototypeToolsInstance === instance) delete host.__prototypeToolsInstance;
      }
    };
    host.__prototypeToolsInstance = instance;
    return instance;
  }

  function inferBaseUrl() {
    const current = packageScriptUrl;
    if (!current) return './';
    return current.slice(0, current.lastIndexOf('/') + 1);
  }

  function appendScript(url) {
    const absoluteUrl = new URL(url, getDocumentBaseUri()).href;
    if (scriptPromises.has(absoluteUrl)) return scriptPromises.get(absoluteUrl);
    const existing = [...(documentRef?.scripts || [])]
      .find((script) => script.src === absoluteUrl);
    const promise = existing
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
      const script = documentRef.createElement('script');
      script.src = absoluteUrl;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`无法加载 Prototype Tools 资源：${absoluteUrl}`));
      (documentRef.head || documentRef.documentElement).appendChild(script);
    });
    const trackedPromise = promise.catch((error) => {
      scriptPromises.delete(absoluteUrl);
      throw error;
    });
    scriptPromises.set(absoluteUrl, trackedPromise);
    return trackedPromise;
  }

  async function load(options = {}) {
    const alreadyLoaded = global.PrototypeToolsTheme
      && global.AnnotationOverlay
      && global.ProjectIterationPanel
      && global.PrototypeToolsStorage
      && global.PrototypeToolsAnnotation
      && global.PrototypeToolsIteration;
    if (alreadyLoaded && !options.sourceFiles && !options.engineUrls) return global.PrototypeTools;

    const baseUrl = new URL(options.baseUrl || inferBaseUrl(), getDocumentBaseUri()).href;
    const engineUrls = options.engineUrls || {};
    const defaultSourceFiles = [
      engineUrls.theme || 'src/prototype-tools-theme.js',
      engineUrls.annotation || 'src/annotation-overlay.js',
      engineUrls.iteration || 'src/project-iteration-panel.js',
      'storage.js',
      'theme.js',
      'annotation.js',
      'iteration.js'
    ];
    const sourceFiles = options.sourceFiles || defaultSourceFiles;
    if (options.sourceFiles) {
      for (const file of sourceFiles) await appendScript(new URL(file, baseUrl).href);
    } else {
      await Promise.all(sourceFiles.slice(0, 3).map((file) => appendScript(new URL(file, baseUrl).href)));
      await Promise.all(sourceFiles.slice(3).map((file) => appendScript(new URL(file, baseUrl).href)));
    }
    return global.PrototypeTools;
  }

  global.PrototypeTools = { version, mount, load };
})(typeof window === 'undefined' ? globalThis : window);
