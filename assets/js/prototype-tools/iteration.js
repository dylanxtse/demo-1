/* Iteration panel feature adapter for Prototype Tools. */
(function (global) {
  function mount(options = {}) {
    if (!global.ProjectIterationPanel?.mount) {
      throw new Error('PrototypeToolsIteration 需要先加载 project-iteration-panel.js');
    }
    const root = global.ProjectIterationPanel.mount(options);
    const controller = root?.__projectIterationPanelController;
    if (controller) return controller;
    return {
      root,
      open: () => root?.querySelector('[data-project-iteration-close]') && root.classList.add('is-open'),
      close: () => root?.classList.remove('is-open'),
      toggle: () => root?.classList.toggle('is-open'),
      destroy: () => root?.remove(),
      refresh: () => undefined,
      getRecords: () => [],
      getDeletedRecords: () => []
    };
  }

  global.PrototypeToolsIteration = { mount };
})(typeof window === 'undefined' ? globalThis : window);
