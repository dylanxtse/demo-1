# Prototype Tools

标注和迭代记录面板的可复用工具包。工具层独立挂载到页面覆盖层，不参与业务组件布局；主题默认读取宿主项目的 `--primary`，生成对比色作为辅助工具强调色。若页面没有加载宿主主题变量，则使用项目统一主题兜底色，保证同一项目的所有页面只有一套工具包主题。

当前版本为 `0.2.1`。源码位于 `src/`，`dist/` 是可直接复制的浏览器 bundle；构建和导出不会依赖采购系统其他页面。

## 目录

- `index.js`：统一入口和生命周期 API。
- `annotation.js`：标注功能适配器。
- `iteration.js`：迭代记录面板适配器。
- `storage.js`：内存、`localStorage`、回调和 HTTP 存储适配器。
- `theme.js`：主题适配桥接；宿主也可以传入自定义主题实现。
- `src/`：标注、迭代面板及其主题和样式源码，构建时只依赖工具包自身目录。
- `build.cjs`：把当前两个功能和适配层打包成可直接复制的 `dist` 文件。
- `export.cjs`：将完整工具包（源码、适配器、构建产物和文档）复制到指定目录。
- `dist/prototype-tools.js`、`dist/prototype-tools.css`：独立使用的浏览器 bundle。

## 最小接入

```html
<link rel="stylesheet" href="prototype-tools.css">
<script src="prototype-tools.js"></script>
<script>
  const storage = PrototypeToolsStorage.createLocalStorageAdapter({
    key: 'my-project-prototype-tools'
  });

  const tools = PrototypeTools.mount({
    root: document.querySelector('#page-root'),
    annotation: {
      projectId: 'my-project',
      pageKey: 'supplier-archive::page',
      definitions: window.pageAnnotations || [],
      storage,
      onChange: ({ type, definition }) => {
        console.log('annotation changed', type, definition);
      }
    },
    iteration: {
      projectId: 'my-project',
      storage,
      records: [],
      persistToProjectCode: true,
      projectCodeSaveEndpoint: '/__iteration-code-save'
    }
  });
</script>
```

`PrototypeTools.mount()` 返回统一实例：

```js
tools.setAnnotationMode(true);
tools.openIteration();
tools.refresh();
tools.destroy();
```

如果直接使用源码入口，可先加载工具包根目录下的 `index.js`，然后执行：

```js
await PrototypeTools.load({ baseUrl: './' });
const tools = PrototypeTools.mount({ root: '#page-root' });
```

重复调用 `load()` 会复用同一资源加载 Promise；重复挂载同一个根节点会返回原实例。组件销毁时会移除全局事件、观察器、定时器和工具层节点，避免页面切换后残留监听。

迭代面板右上角提供“标注按钮”显示开关。关闭时只隐藏页面上的标注按钮和气泡，不删除标注数据；重新打开后恢复显示。状态默认保存在 `localStorage` 的 `prototype-tools-annotation-markers-visible-v1` 中，也可以在挂载时指定：

```js
PrototypeTools.mount({
  annotation: { markersVisible: true },
  iteration: {
    annotationMarkersVisible: true,
    annotationVisibilityStorageKey: 'my-project-annotation-visibility'
  }
});
```

编辑标注时，编辑气泡提供“置灰”按钮。置灰后的标注保留查看和编辑能力，但使用弱化颜色显示，用于表示历史迭代标注；状态会随标注定义保存为 `muted: true`，再次点击“取消置灰”即可恢复。

迭代记录表单会优先从宿主页面标题、`data-platform`、`data-user-end` 或接入配置中识别当前平台；无法识别时不预置平台。表单中的齿轮图标可以打开平台管理，默认只显示“新增平台”入口，点击后才显示输入框，点击向上箭头提交新增。编辑状态下，直接双击下方已有平台按钮可编辑名称并按 Enter 或移开输入框保存；双击平台右上角 X 直接删除。已经被迭代记录引用的平台会在删除时直接提示不可删除，既有迭代记录不会因平台管理操作而改变。平台配置通过与记录相同的存储适配器保存，项目也可以在 `ProjectIterationData.platforms` 中提供可随代码版本管理的平台列表。

也可以只启用其中一个功能：

```js
PrototypeTools.mount({
  root: '#page-root',
  iteration: false
});
```

迭代面板采用两阶段贴边呼出：鼠标移动到页面最右侧时只露出一小段面板，点击露出区域后才完整展开；未点击并移开鼠标时会自动收回，避免误触。

迭代记录支持软删除和回收站恢复。记录会自动补充稳定 `id` 和独立的 `sequence` 编号；点击记录的“删除”后，记录从正常列表隐藏并进入回收站，默认 7 天内可以恢复，恢复后原编号、平台和描述全部保留。`recordRetentionDays` 可以调整恢复期限，过期记录会在下一次项目代码保存时清理。适配器控制器可以通过 `getDeletedRecords()` 读取当前回收站记录。

线上只读策略：工具包在 `http/https` 非本机域名下自动隐藏标注模式、迭代记录新增/修改/删除、回收站恢复和彻底删除入口，并拦截对应事件；`file://`、`localhost`、`127.0.0.1` 和 `::1` 保留编辑能力。宿主也可以显式指定：

```js
window.PrototypeToolsConfig = { readOnly: true };
```

挂载时传入 `readOnly: false` 可在受控环境临时保留编辑入口。

新建记录按钮只在新建面板关闭时显示。每次打开新建面板都会重新初始化表单；取消、保存、关闭面板都会清除上次的新增平台输入框和草稿状态。

## 性能与稳定性约定

- 标注定位会缓存当前页面的占位节点；页面业务 DOM 变化后由观察器统一失效并重新同步。
- 标注和迭代面板的滚动、窗口尺寸变化使用逐帧调度，单帧内合并多次定位和裁切计算，避免连续滚动时重复触发布局读取。
- 主题变量只在值发生变化时写入，减少样式属性变更触发的观察器循环。
- 存储适配器失败时由宿主决定降级策略；工具包不吞掉业务回调异常以外的保存失败，调用方可以通过 Promise 和 `onError` 感知失败。
- `src/` 是工具包和采购系统页面共用的唯一功能源码；页面不再维护 `assets/js/components` 或 `assets/css` 下的重复镜像，更新工具包后重新构建即可。

## 存储约定

适配器统一使用以下接口：

```js
{
  load(scope),
  save(scope, value),
  remove(scope)
}
```

标注的 `value` 是单条标注定义，迭代面板的 `value` 是记录数组。生产项目可以用 `createCallbackAdapter` 接入自己的接口或代码保存服务：

```js
const storage = PrototypeToolsStorage.createCallbackAdapter({
  load: (scope) => api.load(scope),
  save: (scope, value) => api.save(scope, value),
  remove: (scope) => api.remove(scope)
});
```

工具包不假设宿主项目的后端、路由或代码写入方式；需要把内容写回项目代码时，由宿主通过 `storage` 或 `annotation.save` 提供实现。这样工具包可以复用，项目的数据边界仍然由项目自己控制。

如果宿主提供了项目代码保存接口，也可以让迭代记录和涉及平台直接写回项目数据文件：

```js
PrototypeTools.mount({
  root: '#page-root',
  iteration: {
    persistToProjectCode: true,
    projectCodeSaveEndpoint: '/__iteration-code-save'
  }
});
```

接口接收 `{ kind: 'records' | 'platforms', value: [...] }`，保存成功后返回 `{ ok: true, kind, value }`。本项目的保存服务会将内容写入 `assets/js/data/project-iteration-records.js`，因此可以随代码提交和上推。

## 主题

默认主题流程是：读取 `PrototypeToolsConfig.projectColor` 或宿主项目 `--primary` → 若页面未提供主题变量则使用项目统一兜底色 → 取互补色 `H + 180°` → 保持 `H` 不变并将 `S/L` 校正到 `55%～75%` → 将校正后的颜色应用到标注和迭代面板。项目也可以在工具包加载前统一指定主色：

```html
<script>
  window.PrototypeToolsConfig = { projectColor: '#0249c4' };
</script>
```

若项目需要指定辅助色，可以传入同样的 `apply` 接口：

```js
const theme = {
  apply(target) {
    target.style.setProperty('--prototype-accent', '#d97706');
    target.style.setProperty('--prototype-accent-strong', '#b45309');
    target.style.setProperty('--prototype-accent-soft', 'rgba(217, 119, 6, .10)');
  }
};

PrototypeTools.mount({ root: '#page-root', theme, annotation: { theme }, iteration: { theme } });
```

## 构建

在工具包目录执行：

```bash
node build.cjs
```

导出完整独立工具包：

```bash
node export.cjs /path/to/tool
```

目标目录会包含 `dist/`、`src/`、适配器、构建脚本和 README。其他项目只需要引用：

```html
<link rel="stylesheet" href="./tool/dist/prototype-tools.css">
<script src="./tool/dist/prototype-tools.js"></script>
```

以后迁移到其他项目时，直接复制导出目录即可；只想快速接入时复制 `dist` 下的两个文件，若需要继续开发源码则保留 `src/`、适配器和构建脚本，执行 `node build.cjs` 即可重新构建，不再依赖原采购项目的目录结构。
