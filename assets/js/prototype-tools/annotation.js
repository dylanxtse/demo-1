/* Annotation feature adapter for Prototype Tools. */
(function (global) {
  function resolveRoot(root) {
    if (typeof root === 'string') return document.querySelector(root);
    return root?.nodeType === 1 ? root : document.body;
  }

  function mount(options = {}) {
    if (!global.AnnotationOverlay?.mount) {
      throw new Error('PrototypeToolsAnnotation 需要先加载 annotation-overlay.js');
    }
    const root = resolveRoot(options.root);
    const saveDefinition = options.save || options.onSave || options.storage?.save
      ? (context) => {
        if (typeof options.save === 'function') return options.save(context);
        if (typeof options.onSave === 'function') return options.onSave(context);
        return options.storage.save(context, context.definition);
      }
      : undefined;
    const controller = global.AnnotationOverlay.mount(
      root,
      options.definitions || options.annotations || [],
      {
        projectId: options.projectId,
        pageId: options.pageId,
        pageKey: options.pageKey,
        data: options.data,
        theme: options.theme,
        readOnly: options.readOnly,
        saveDefinition,
        onChange: options.onChange
      }
    );
    return {
      ...controller,
      root,
      pageKey: controller.pageKey || options.pageKey || options.pageId
    };
  }

  global.PrototypeToolsAnnotation = { mount };
})(typeof window === 'undefined' ? globalThis : window);
