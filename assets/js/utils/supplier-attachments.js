(function () {
  let database;
  function validate(file) {
    if (!file || !/\.(png|jpe?g)$/i.test(file.name) || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('仅支持png、jpg、jpeg格式的图片');
    if (file.size > 20 * 1024 * 1024) throw new Error('单张图片不能超过20M');
    if (!file.size) throw new Error('不能上传空文件');
  }
  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('当前环境无法保存图片'));
      const request = window.indexedDB.open('procurement-supplier-attachments', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('图片存储打开失败'));
    });
    return database;
  }
  async function operation(mode, callback) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('files', mode);
      const request = callback(transaction.objectStore('files'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(new Error('图片保存或读取失败，请重试'));
    });
  }
  window.SupplierAttachments = {
    validate,
    async save(file) {
      validate(file);
      const metadata = { id: `SF-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, name: file.name, type: file.type, size: file.size };
      await operation('readwrite', (store) => store.put({ ...metadata, blob: file }));
      return metadata;
    },
    async get(id) { return (await operation('readonly', (store) => store.get(id)))?.blob || null; },
    async remove(id) { await operation('readwrite', (store) => store.delete(id)); }
  };
})();
