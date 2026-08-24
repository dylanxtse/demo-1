(function () {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  window.DomUtils = {
    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (character) => htmlEntities[character]);
    }
  };
})();
