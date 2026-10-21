(function () {
  function mount(root) {
    const detail = root?.querySelector?.('.school-recipe-demand-detail-scroll');
    const panel = detail?.closest('.school-recipe-demand-detail-panel');
    const footer = panel?.querySelector('.school-recipe-demand-actions');
    if (!detail || !footer) return;
    detail.querySelectorAll('.school-recipe-demand-table-wrap').forEach((wrap) => {
      const table = wrap.querySelector('table');
      const totals = table?.querySelector('tfoot');
      if (!totals) return;

      const bar = document.createElement('div');
      bar.className = 'school-recipe-demand-sticky-totals';
      const pinnedTable = document.createElement('table');
      pinnedTable.className = table.className;
      pinnedTable.style.cssText = table.style.cssText;
      const columns = table.querySelector('colgroup');
      if (columns) pinnedTable.appendChild(columns.cloneNode(true));
      pinnedTable.appendChild(totals);
      bar.appendChild(pinnedTable);
      panel.insertBefore(bar, footer);

      const syncHorizontalScroll = () => {
        bar.scrollLeft = wrap.scrollLeft;
      };
      const syncTableScroll = () => {
        wrap.scrollLeft = bar.scrollLeft;
      };
      wrap.addEventListener('scroll', syncHorizontalScroll, { passive: true });
      bar.addEventListener('scroll', syncTableScroll, { passive: true });
      syncHorizontalScroll();
    });
  }

  window.SchoolRecipeConfirmStickyTotals = { mount };
})();
