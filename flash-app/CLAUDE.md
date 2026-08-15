# 闪应用开发基础规范

本规范是闪应用开发的通用基础规范，也是所有闪应用实现必须遵守的底层核心约束。

---

## 什么是闪应用

从技术层面看，闪应用是基于 React + TypeScript 构建的 HTML5 Web App。闪应用运行在移动端 App WebView、Web 端 PC 浏览器或移动端浏览器的 iframe sandbox 中。

闪应用通过 `lingguang.*` API 与宿主交互，获取读写相册、DB 存储等增强能力。除非特殊说明，浏览器原生 API 默认可用。

---

## 技术栈

- React 18 + TypeScript
- Vite 7
- Tailwind CSS 3.4

---

## 依赖与组件说明

- 开发环境已经集成若干组件和工具库。开发相关功能时，应优先使用已有组件或工具库，以保持代码简洁、可靠。所有可用依赖都声明在 `package.json` 中，如有需要可自行查看。
- 目前仅允许使用 `package.json` 中已经集成的依赖，不可自行安装。

## 数据库应用开发

- 开发带数据库的应用前，必须先阅读 `docs/API_DB.md` 和 `docs/API_DATABASE.md`：前者规定数据选型、权限模型和运行时 `lingguang.db` 用法，后者规定源码 Drizzle 目录、schema registry、migration 和本地预览流程。
- 表结构必须写在源码的 `database/schema/*.ts` 中；业务运行时只能通过 `lingguang.db.query/execute` 执行 DQL/DML，禁止运行时 DDL。
- 不使用数据库的应用不要创建 `database/` 目录。使用数据库时，先在 `docs/prd.md` 为每个数据对象说明谁创建、谁可读、谁可写，并确定 `user`、`managed_user`、`share` 或 `share_owned`；随后在 `database/schema/index.ts` 通过 `defineLingguangSchema` 为每张表登记一致的 `tableKind`。
- schema 使用 MySQL dialect 和静态 Drizzle 声明。只从 `drizzle-orm/mysql-core` 导入项目契约支持的 builder；不要引入动态表达式、自增主键、外键、索引、函数默认值或平台保留字段。以 `npm run db:check` 的结果作为契约是否支持的最终判断。
- 每次新增或修改 schema 后，必须依次执行：

  ```bash
  npm run db:generate -- --name=<migration_name>
  npm run db:check
  npm run dev
  ```

- `db:generate` 产出的 SQL、`meta/_journal.json` 和 snapshot 必须与 schema 一起保留。禁止手写 migration，禁止修改、删除、重排或 squash 已应用的 migration；migration 只允许 `CREATE TABLE` 和 `ALTER TABLE ... ADD COLUMN`，不得包含 `INSERT`、`UPDATE`、`DELETE` 等数据初始化语句。
- 本地数据库位于 `.local-preview/app.sqlite`。历史 migration 变化导致预览拒绝启动时，优先恢复 migration；只有确认本地数据可以全部丢弃后，才允许执行 `npm run db:reset-local`，然后重新启动预览。
- 交付前除真实验证数据库的新增、查询、修改、删除外，仍必须运行完整的 `npm run check`。

---

## 代码模块化规范

- `src/main.tsx` 是平台维护的可信应用入口，禁止修改；业务代码应放在 `src/App.tsx` 或其他业务模块中。
- 不要把所有代码放在单个文件中，应主动拆分为独立模块。
- 单个组件文件不要超过 300 行。

---

## 开发规范

- 优先使用 Tailwind CSS 工具类（utility classes）实现样式。仅在 Tailwind 无法满足需求时，才使用自定义 CSS。
- 可以使用 Material Icons 加强视觉表达。
- HTML 中的所有交互控件都必须明确指定唯一的 `data-testid`。对于 `radio` 类型控件，`data-testid` 需要加在 `label` 上；如果不提供，测试工具会报错。
- `canvas` 元素的 `width`、`height` 属性禁止直接设置像素值，必须通过 JS 动态计算：先根据屏幕宽度和预期展示占比计算 `width`，再按比例计算 `height`。
- 必须在项目根目录创建并维护 `manifest.json`。
- 禁止将 `manifest.json` 放在 `src/`、`public/` 或任何其他子目录。
- `manifest.json` 至少必须包含 `navigationBar.visible`、`navigationBar.title`、`navigationBar.backgroundColor`、`navigationBar.foregroundColor`、`orientation`。
- `orientation` 为必填字段，只允许填写 `"portrait"` 或 `"landscape"`。
- 开始实现前必须根据应用实际主体验选择 `orientation`：普通工具、内容展示、表单、聊天、榜单、竖向信息流等默认使用 `"portrait"`；横版游戏、3D 场景、横向画布、横向操控区或明显更适合横屏的应用使用 `"landscape"`。填写值必须与实际布局和验收方向一致。
- `navigationBar.backgroundColor` 与 `navigationBar.foregroundColor` 的颜色值只允许使用 `#RRGGBB` 格式。
- `navigationBar.title` 禁止包含 HTML 特殊字符 `< > & " '`。

# 开发前编写prd.md

编写代码前，必须先根据用户 prompt 产出一份 `prd.md` ，请把 `prd.md` 写在 `docs/prd.md` 中。这个文件是产品需求文档，应该具体描述本次要实现的目标、核心功能、交互流程、验收标准等，无需写入技术方案。

后续代码实现必须以 `docs/prd.md` 为准。如果开发过程中发现产品需求需要调整，先更新 `docs/prd.md`，再继续修改代码。

### 开发 Prompt 记录

- 必须在项目根目录创建并维护 `agent-prompts.json`，其结构必须与根目录的 `agent-prompts.example.json` 一致。
- `agent-prompts.json` 只用于记录开发过程，不属于应用运行时配置，禁止在业务代码中读取、引用或展示该文件。
- 每一条触发 Agent 工作的用户消息都对应 `prompts` 数组中的一个元素。每轮结束并回复用户前，必须把本轮用户消息追加到数组末尾。
- 必须保存用户输入的原始完整文本，包括换行、代码块和标点；禁止总结、润色、翻译或截断。
- 只记录用户消息，禁止记录 system prompt、本文件内容、工具输出、Agent 回复或内部推理。
- 只能追加记录，禁止覆盖、删除、修改或重新排序已有记录。不同轮次即使文本完全相同，也必须分别记录，禁止按文本去重。
- 更新后必须保证文件是合法 JSON：`schemaVersion` 必须为 `1`，`prompts` 必须是字符串数组。初始数组可以为空，但其中已有的元素不得为空字符串或纯空白。

- **跨目录导入使用 `@/` 路径别名**：`@/*` 已映射到 `src/*`，跨目录导入时用 `@/` 代替 `../`；同目录导入可以使用 `./`。
- 本项目是运行在浏览器中的 React + TypeScript 前端代码，禁止使用任何 `NodeJS.*` 类型（例如 `NodeJS.Timeout`、`NodeJS.Timer` 等），也不要从 Node.js 内置模块导入内容。
- **禁止使用 `fonts.googleapis.com`，禁止引入其他第三方 JS 或 CSS 资源。**
- 禁止使用浏览器原生方法 `alert()` 和 `confirm()`。如需提示或确认功能，必须使用模拟弹窗效果。
- 禁止使用 `window.parent.postMessage` 向父窗口发送消息。
- 禁止在 JSX/TSX 中直接使用原生 `<iframe>`，也禁止通过 `document.createElement('iframe')`、`React.createElement('iframe')` 等方式动态创建 iframe。
- **音频规范（强制）**：播放音频文件、背景音乐、语音片段时，必须使用 `@/lib/audio` 导出的 `Howl` / `Howler`，禁止直接从 `howler` 导入；合成/乐器/节拍类音效必须使用 `@/lib/tone`，禁止直接从 `tone` 导入。音频能力必须走脚手架封装入口，不要自行实现第二套音频底层。
- **图片资源引用**：图片必须先使用 `import` 导入，再在页面中引用，禁止直接使用字符串路径。
  - 正确做法：`import userImg from './assets/user.png';`，然后使用 `<img src={userImg} />`。
  - 错误做法：`<img src="assets/user.png" />` 或 `<img src="./assets/user.png" />`，这类写法会导致 404。
- `<div id="container"></div>` 是应用 DOM 结构的顶层容器。如果应用需要设置背景色，可以设置在 `container` 这一层；也可以设置在更上层的 `<body></body>`。
- 凡是读取 `window.localStorage.getItem` 等持久化数据时，都必须假设数据可能来自旧版本，可能缺字段、字段类型不一致，或结构已经变化。必须先做 schema 归一化和兜底，再渲染页面和执行业务逻辑。
- 优先使用安全写法：数组使用 `Array.isArray(x) ? x : []` 或 `x ?? []`，对象使用 `x ?? {}`，属性访问使用 `obj?.a?.b`，字符串使用 `typeof x === 'string' ? x : ''`，数字使用 `typeof x === 'number' ? x : 0`。
- 单条脏数据不能导致页面崩溃。

---

## 视觉安全区规范

应用运行在全屏 WebView 中，客户端右上角会浮动系统操作按钮。安全区按标准 CSS `env(safe-area-inset-*)` 处理即可。

必须在 CSS 文件中使用 `env(safe-area-inset-top, 0px)`、`env(safe-area-inset-bottom, 0px)` 等标准写法处理安全区；不要把 `env(safe-area-inset-*)` 写在 TSX、JS 字符串或内联样式字符串里。

不要在 viewport 顶部 `env(safe-area-inset-top, 0px)` 范围内放置可交互元素，例如按钮、输入框、菜单、关闭按钮、悬浮操作入口等。背景、装饰图、不可交互内容可以延伸到该区域，但用户可点击、可拖拽、可聚焦的元素应避开该区域。

如果需要使用 `position: absolute` 或 `position: fixed` 放置靠近屏幕边缘的可交互元素，必须按方向叠加对应安全区，例如：

```css
.floating-action {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 16px);
  right: 16px;
}
```

不要直接写：

```css
top: 16px;
```

除非该元素明确不是可交互元素，或者它位于页面背景层、装饰层。

---

## 音频开发规范

- 需要音频播放能力时，统一使用 `import { Howl, Howler } from '@/lib/audio'`。
- `./src/assets/facebook-sound-kit` 是项目内置的 `.m4a` 音效资源目录，可自行查找和引用。例如 `./src/assets/facebook-sound-kit/buttons-and-navigation/button-1.m4a` 是按钮音效：路径中的 `buttons-and-navigation` 表示该文件夹存放按钮与导航类音效，文件名则直接表明其适用场景。
- 需要合成音效、乐器、节拍、环境声或交互反馈音时，统一使用 `import * as Tone from '@/lib/tone'`，不要直接从 `tone` 导入。
- Tone.js 需要在用户点击、触摸等手势回调中调用 `await Tone.start()` 启动音频上下文，再创建 `Tone.Synth`、`Tone.PolySynth`、`Tone.MembraneSynth`、`Tone.NoiseSynth`、`Tone.Sampler`、`Tone.Player`、`Tone.Transport`、`Tone.Sequence`、`Tone.Loop` 等高层音频对象。
- 通过 `@/lib/audio` 和 `@/lib/tone` 创建的音频会接入宿主静音管控。业务代码不要直接修改总输出静音状态，例如不要写 `Tone.getDestination().mute = false` 或 `Tone.Destination.mute = false`；如需调节音量，调整具体乐器、播放器或效果节点的 `volume`。
- 禁止直接使用浏览器原生 AudioContext 相关 API，也禁止访问 Tone.js 底层上下文能力，例如 `Tone.getContext()`、`Tone.setContext(...)`、`Tone.context`、`new Tone.Context(...)`、`new Tone.OfflineContext(...)`、`rawContext`。

## 质量门禁

- 对外发布、提交或交付前，必须运行 `npm run check` 作为统一质量门禁。必须确保 `npm run check` 通过。
