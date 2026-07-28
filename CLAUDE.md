# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

yystudy 是一个学习工具集（考试备考辅助），部署在 GitHub Pages，后端用 Supabase 做跨设备数据同步。没有构建步骤，纯静态 HTML/CSS/JS。

## Architecture

```
index.html          ← 工具集 Hub 页（可折叠导航栏 + iframe 容器）
cloud-localstorage-sync.js  ← localStorage 自动同步到 Supabase（透明拦截层）
storage-polyfill.js ← 为脱离 Claude Artifact 环境运行的工具提供 window.storage API
tool-notebook.html  ← 资料分析·错题本（根目录）
tool-graphic.html   ← 图推错题整理（根目录）
tool-translate.html ← 翻译推理知识点（根目录）
tool-quant.html     ← 数量关系·知识点（根目录）
tools/
  tool-memory.html  ← 资料分析·小分互换记忆卡
  tool-blocks.html  ← 图推·电子积木沙盒（Three.js，见下方专门章节）
  vendor/three/     ← 本地 vendor 的 Three.js r160 + OrbitControls,tool-blocks.html 专用,不要改回 CDN
fonts/
  ELEYANG-Soft-Bold.ttf  ← 工具内用作徽章/印章字体
  新海山峦.ttf
data/
  quant-data.json   ← 数量关系知识库（13 板块 / 33 分组 / 62 知识点 / 76 例题，89KB）
```

**⚠️ 四个主力工具（notebook / graphic / translate / quant）在项目根目录，不要移到 tools/ 子文件夹。** 之前有过一次误移又改回来的教训（commit `f81acbe`）。

### Hub 页 (`index.html`)

- 顶部是可折叠 `<header>`：收起时显示一行"学习工具集 ▾"（`.header-peek`），hover/点击展开显示标题 + 工具标签按钮
- `<nav>` 里的按钮通过 JS 动态生成，点击在 `<main>` 中懒加载对应 `<iframe>`
- 用 `localStorage('hub-last-tab')` 记住上次打开的工具
- CSS 变量 `--serif` / `--sans` 定义字体栈，`--paper` / `--surface` / `--ink` / `--accent` 等定义颜色
- 工具入口配置数组在 `index.html` 的 `<script>` 中，每个入口 `{ id, label, src }`，`src` 指向根目录的 HTML 文件路径

### 数据同步层

- **`storage-polyfill.js`**：为原本在 Claude Artifact 里写的工具提供 `window.storage.get/set/delete/list`，云端优先，失败降级到 localStorage。通过 `data-tool` 属性做命名空间隔离。
- **`cloud-localstorage-sync.js`**：对直接使用原生 `localStorage` 的工具，拦截 `Storage.prototype.setItem/removeItem`，启动时用同步 XHR 拉取云端数据预填到 localStorage，之后每次写入做 800ms 防抖后异步同步到 Supabase。通过 `data-tool` 属性做命名空间隔离，可选 `data-exclude-prefix` 跳过特定 key（避免和工具自己的大数据同步机制打架）。

两类脚本在同一页面里只应引入一个，不能混用。

**当前同步状态**：
- `tool-notebook.html` — 使用 `storage-polyfill.js`（Supabase 云端同步）
- `tool-graphic.html` — 使用 `cloud-localstorage-sync.js`（Supabase 云端同步）
- `tool-translate.html` — 使用 `cloud-localstorage-sync.js`（Supabase 云端同步）
- `tool-quant.html` — **仅 localStorage，尚未接入 Supabase**（`STORE_KEY = 'quant_data'`，数据从 `data/quant-data.json` 首次加载后存入 localStorage）

### 工具页设计约定

- 每个工具页是自包含的 HTML 文件，`<style>` 和 `<script>` 都写在同一个文件里
- 图推错题整理（tool-graphic.html）有两套皮肤：默认（蓝灰调）和粉调 `.skin-pink`，后者通过覆盖 CSS 变量切换，会将 `--font-sans` 重定义为 `"Noto Serif SC", serif` 让正文变宋体
- 资料分析错题本（tool-notebook.html）有「文艺粉」皮肤 `html[data-theme="pink"]`
- 翻译推理（tool-translate.html）和数量关系（tool-quant.html）直接使用文艺粉风格作为默认
- 表单项、按钮等交互元素通过统一的 CSS 变量控制样式，不内联写死颜色
- 部分工具用 Google Fonts 加载 `Noto Serif SC`

### 后端

Supabase 项目，REST API endpoint：`https://tfvgntgamixgzjjvumcy.supabase.co/rest/v1/app_data`

`app_data` 表结构（复合主键 `tool_name + data_key`）：
- `tool_name` — 工具标识（对应脚本里 `data-tool` 属性的值）
- `data_key` — 存储键
- `data_value` — 存储值（文本）
- `updated_at` — 时间戳

所有请求用 anon key 鉴权，upsert 用 `on_conflict=tool_name,data_key` + `resolution=merge-duplicates`。

## 设计规范

### 选中/激活状态

只用粉色文字 + 加粗表示激活态，**禁止**使用背景色块、边框、阴影：
```css
/* ✅ 正确 */
.nav button.active { color: #E8317C; font-weight: 600; }

/* ❌ 禁止 */
.nav button.active { background: #FDEAF1; border-bottom: 2px solid #E8317C; }
```

### 导航栏和侧栏背景

导航栏、侧栏等非内容区的背景用 `--surface-alt`（暖灰粉 `#F7F5F4`），不要用纯白 `#FFFFFF`。

### 字体

全站统一使用 `--serif` 宋体栈（`"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif`），不要混用 `--sans`。

### 皮肤切换

切换皮肤（如 tool-graphic.html 的 `.skin-pink`）后**必须调用 `renderAll()`**，否则 JS 动态生成的内容会残留上一套皮肤的样式/颜色值。

#### tool-quant.html 薄荷绿皮肤 `html[data-theme="mint"]`

**⚠️ 最终确定版，纯色方案。** 经过多轮迭代，最终确认以下变量：

| 变量 | 色值 | 色名 | 用途 |
|------|------|------|------|
| `--accent` | `#9CC8C1` | 中调青绿 | 强调色：标题装饰字、标签、按钮、答案文字、导航高亮 |
| `--accent-hover` | `#9CC8C1` | 同 accent | 悬停色（12 处 hover 规则），已统一为与 accent 一致 |
| `--tip-bg` | `#D6EEF2` | 浅蓝绿 | 「思维拓展」/TIPS 提示框背景（纯色） |
| `.addhere` | `#5D9BEC` | 蓝色 | 卡片操作按钮（标记错题/编辑/删除），独立于 accent |

派生变量：`--accent-soft:#DCF0EC` / `--tip:#9CC8C1` / `--coral:#9CC8C1` / `--coral-bg:#DCF0EC`。

`:root` 中 `--accent-hover: #E8317C`（粉），薄荷绿覆盖为 `#9CC8C1`。所有 hover 规则通过 `var(--accent-hover)` 引用，文艺粉和薄荷绿各自生效。

其余所有变量保持文艺粉皮肤原值。`.pk-waveline` 装饰分隔线使用 `repeating-linear-gradient` + `var(--accent-soft)`，颜色自动跟随主题。

**关键 CSS 依赖**：`.pt-tips` 的 `background` 必须使用 `var(--tip-bg)` 而非 `var(--accent-soft)`（2026-07-27 修复）。

### 大文件

不要读取 `data` 相关的数据文件（`data/quant-data.json` 约 89KB，但只读不写即可）——搜索、查找时跳过这些文件。`data/raw-txt/` 已删除（commit `4889492`），不再存在。

## 数量关系·知识点 (`tool-quant.html`)

- 数据来源：22 份 PDF 讲义（四海·25 下半年数量关系随堂笔记），原始提取文本已删除
- 数据文件：`data/quant-data.json`，结构 `categories → groups → points`，13 板块 / 33 分组 / 62 知识点 / 76 例题
- 部分知识点带 `diagram` 字段（`type: "svg"` 或 `"mermaid"`），共 7 个图解
- 三级结构和 tool-notebook.html 保持一致
- 首次加载时自动将斜杠分数（`a/b`）转为 `[[a/b]]` 堆叠格式并写入 localStorage
- 已加入 `index.html` 导航入口（`id: 'quant', label: '数量关系·知识点'`）
- 提供速查索引独立页面、搜索浮层、公式表格/网格渲染、图形公式 SVG 图标等

## 富文本标记系统

`tool-quant.html`、`tool-notebook.html`、`tool-translate.html` 三个工具共享一套标记系统。`tool-graphic.html` 暂不接入。

### 颜色调色板（以 tool-translate.html 原始配色为准，共 5 色）

以 tool-translate.html 最初的 4 色为基础（薄荷绿/雾玫瑰/奶油色/卡其色），额外加一个蓝色。**曾经短暂统一成"6 色"方案（黄/绿/蓝/粉/米/玫红），色值不对，已废弃**，不要再用那套。

| 色名 | 变量 | 色值 |
|------|------|------|
| 薄荷绿 mint | `--hl-mint` | `#CFE9E2` |
| 雾玫瑰 rose | `--hl-rose` | `#FCD4D8` |
| 奶油色 cream | `--hl-cream` | `#F3EADA` |
| 卡其色 khaki | `--hl-khaki` | `#EDDAC9` |
| 蓝 blue | `--hl-blue` | `#C6DCF6` |

JS 常量：`HL_COLORS = ['mint','rose','cream','khaki','blue']`（tool-translate.html 里没有命名，直接用 `HIGHLIGHT_COLORS`/`UNDERLINE_COLORS` 这两个同值的 hex 数组）。

已保存数据里如果还有旧色名（`yellow`/`green`/`pink`），渲染时会自动映射到最接近的新色（`yellow→khaki`、`green→mint`、`pink→rose`），不会因为改色卡就丢失已标记的颜色。

### 标记类型

| 类型 | 渲染标签 | 存储格式 | 说明 |
|------|---------|---------|------|
| 背景高亮 | `<mark class="hl hl-COLOR">` | `{{hl:COLOR\|text}}` | 背景色块 |
| 下划线 | `<span class="hl-ul" data-hlc="COLOR">` | `{{ul:COLOR\|text}}` | 直线下划线 |
| 波浪线 | `<span class="hl-wl" data-hlc="COLOR">` | `{{wl:COLOR\|text}}` | 波浪下划线 |

高亮/下划线/波浪线可以共存叠加；下划线和波浪线互斥（同一段文字只能有一种划线样式）。

### UI 入口

- **tool-quant.html**：左侧 rail 星形图标 → 鼠标悬浮展开颜色+样式面板（`.hl-flyout`）；面板下方有撤销/恢复/橡皮擦独立图标
- **tool-notebook.html**：顶部 nav 🖍 按钮 → 点击展开色板（`.hl-palette`）
- **tool-translate.html**：TOC 底部 `.mark-tool` 按钮行 → 点击三角展开 `.mark-popover`

### 撤销/重做

统一 25 步撤销栈，覆盖：编辑内容修改、高亮/下划线/波浪线标记、橡皮擦操作、删除知识点、添加/编辑/删除错题、一键分数转换。按操作时间顺序后进先出。快捷键 Ctrl+Z / Ctrl+Shift+Z。

### 渲染/序列化管线

**⚠️ tool-quant.html 的标记数据结构已经重构，和下面这套不一样**：不再是"文本里内嵌 `{{hl:...}}` 语法"，而是 `{text, marks:[{start,end,type,color}]}` 结构化数组（`type:'bg'`/`'ul'`/`'wl'`），编辑时选区换算成纯文本偏移做纯数据计算，不再有 `serializeHl`/`commitHlField`，核心函数是 `migrateAllRichText`/`renderMarked`/`parseLegacyMarkup`/`applyMarkOp`/`tryHighlightSelection`（新版）。tool-notebook.html 和 tool-translate.html 仍是下面这套旧架构：

- `fracRender(str)`：存储格式 → HTML（`{{hl:...}}` → `<mark>`，`[[a/b]]` → 堆叠分数，`^text^` → 上标，`~text~` → 下标）
- `serializeHl(el)`：DOM → 存储格式（反向）
- `tryHighlightSelection()`：获取 Selection Range → 包裹 `<span>`/`<mark>` → 调用 `commitHlField`
- `commitHlField(container)`：pushUndo → serializeHl → 写 DATA → saveData → render

**⚠️ 标记 span 的 CSS 必须加 `color:inherit; font-size:inherit; font-weight:inherit`**，防止样式泄漏到父级元素。下划线颜色用 `data-hlc` 属性 + CSS 属性选择器实现，**不用 inline style**（浏览器对 CSS 变量在 inline style 中的解析不稳定）。

## 已知历史踩坑记录

1. **文件路径**：四个主力工具文件（notebook / graphic / translate / quant）在项目根目录，不要移到 `tools/` 子文件夹。曾误移又改回（commit `f81acbe`）。`tools/` 目录下只有 `tool-memory.html` 和 `tool-blocks.html`。

2. **class 命名冲突**：高亮面板的 class（`#hlRailWrap` / `.hl-flyout` / `.pk-open`）和小索引滚动高亮的 class（`.mi-item.active`）必须完全独立，避免选择器冲突。曾因 `#hlRailWrap` 设置 `padding-right:220px` 导致 hover 区域与小索引重叠、误触发面板弹出。

3. **标记 DOM 操作**：用 `Range.surroundContents()` + `Selection API` 精确包裹选区，**不要**用 `document.execCommand`（已废弃且行为不稳定）或整段替换 `innerHTML`。选区包裹时排除 `.frac` / `sup` / `sub` 内部（避免撕碎分数/上下标结构）。

4. **渲染时机**：`commitHlField` 调用 `render()` 后会重建整个 `#app` 的 innerHTML。标记的视觉效果来自 `fracRender()` 重新生成的 HTML，不是来自 DOM 操作残留。如果序列化/反序列化管线出错，标记会泄漏到不该影响的范围。

5. **小索引滚动高亮**：用"阅读锚点"判定（视口 35% 高度处），scroll 事件 + `requestAnimationFrame` 节流。三层结构只有知识点标题参与颜色变化，板块和分组标题固定黑色不参与。

6. **工具间颜色同步**：曾出现 translate 用一套颜色、quant/notebook 用另一套的情况。中途统一成"6 色标准色卡"过一次，但色值取错了、和 translate 原始配色对不上。最终以 **translate 的原始 4 色（薄荷绿/雾玫瑰/奶油色/卡其色）+ 新增蓝色，共 5 色** 为准，三个工具保持一致（见上面「颜色调色板」表格）。新增/改动颜色时需同步更新四个位置：CSS 变量、`HL_COLORS`/`HIGHLIGHT_COLORS` 数组、`mark.hl`/`.hl-{name}` 背景类、`hl-ul`/`hl-wl` 属性选择器；改色名时记得给旧色名加映射（防止已保存的标记颜色对不上新 class 而"隐形"）。

7. **批量脚本修改多文件后必须逐个验证语法**：曾用 Python 脚本给多个文件批量插入 `try/finally` 防重复提交代码，因文本匹配不精确，`tool-notebook.html` 出现了孤立 `finally` 块导致整个 JS 脚本解析失败、页面白屏。`tool-graphic.html` 当时被发现并修复了，但 `notebook` 被遗漏，直到用户反馈白屏才排查出来。教训：批量修改后必须对每个文件单独运行 `node --check` 验证 JS 语法，且要手动抽查关键函数的配对完整性（`try`/`catch`/`finally` 括号匹配）。

8. **`hidden` 属性会覆盖 CSS 显示规则**：tool-translate.html 的高亮/下划线悬浮面板（`.mark-popover`）长期不出现，排查了几次都只看 `:hover`/`opacity`/`.open` 这套 CSS，没发现问题——真正原因是面板的 HTML 上还留着 `hidden=""` 属性，浏览器对 `[hidden]` 元素默认套用 `display:none`，而 `display:none` 的元素不管 opacity/visibility/class 怎么变都不会显示，JS 的 toggle 逻辑（`toggleMarkPopover`/`closeMarkPopovers`）也从来没碰过这个属性。**以后排查"悬浮面板/弹出层死活不出现"类问题，第一步应该是在 Elements 面板检查元素本身有没有 `hidden` 属性或内联 `display:none`，而不是一上来就扎进 hover/opacity 相关的 CSS 规则里找**。

9. **不要硬编码 CDN 地址且无 fallback，尤其是 `<script type="module">` + importmap 这种"全有全无"的加载方式**：tool-blocks.html 用户反馈"根本不能用"，本地实测（点击加减方块、拖拽转视角、移动/旋转零件、改色、撤销重做等）却全部正常——因为测试环境能正常访问 `cdn.jsdelivr.net`，而用户的网络环境访问不了。importmap 引入 three.js/OrbitControls 时若 CDN 不可达，整个 module script 会静默完全不执行，所有按钮在 DOM 里都在、看起来正常，但点击零响应，且控制台/页面都不会有任何提示,与用户反馈的"根本不能用"完全吻合。**以后排查"我这边测试都正常,但用户说完全用不了"类反馈，要优先怀疑外部资源加载类问题（CDN、字体、第三方脚本），而不是假设自己复现失败就说明没问题——测试环境的网络可达性不能代表用户的网络环境**。已将 three.js 相关文件 vendor 到 `tools/vendor/three/`，移除运行时 CDN 依赖，其余工具目前都没有类似的运行时 CDN 依赖（Google Fonts 走的是渐进增强，加载失败只是字体降级不影响功能，风险等级不同）。

## 小索引滚动高亮功能

四个工具都实现了左侧 sticky 迷你索引的滚动同步高亮，逻辑统一：

### 三层颜色规则

| 层级 | 元素 | 默认色 | 滚动高亮 | 参与变色 |
|------|------|--------|----------|----------|
| 板块标题 | `<h4>` | `var(--ink)` | 不变 | ❌ |
| 分组标题 | `.mi-group-name` | `var(--ink)` | 不变 | ❌ |
| 知识点标题 | `.mi-item` | `var(--ink-soft)` | → `var(--accent)` | ✅ |

知识点标题有 `transition: color .18s ease` 让高亮切换平滑。

### 判定逻辑：「阅读锚点」

**不是简单的进入视口判定**。用 scroll 事件 + `requestAnimationFrame` 节流，在视口 35% 高度处设一条"阅读基准线"。遍历所有卡片，找到顶部越过这条线且离它最近的卡片作为当前高亮目标。如果所有卡片都在基准线以下，高亮第一个。

### 四个文件的实现对照

| 文件 | 函数名 | 索引元素 | 条目选择器 | 卡片选择器 | 调用位置 |
|------|--------|----------|-----------|-----------|----------|
| tool-quant.html | `setupMiniScrollSpy()` | `#miniIndex` | `.mi-item[data-mijump]` | `.card[data-pt]` | `render()` → `renderMiniIndex()` + `renderMain()` 之后 |
| tool-notebook.html | `setupMiniScrollSpy()` | `#pinkMiniIndex` | `.mi-item[data-mpt]` | `#app .card[data-pt]` | `render()` → `syncPinkRail()` 之后 |
| tool-graphic.html | `setupMiniScrollSpy()` | `#browseMiniIndex` | `.mi-item[data-topic-id]` | `#browseView .topic[data-topic-id]` | `renderBrowse()` → `renderBrowseMiniIndex()` 之后 |
| tool-translate.html | `setupTocScrollSpy()` | `#tocList a` | `a[data-for]` | `.card[id]` | `renderAll()` → `renumber()` 之后 |

## 高亮悬浮面板命名规范

左侧导航栏的「★」高亮图标有一个悬浮面板（颜色 + 样式选择），其 class 和逻辑必须与 mini-index 滚动高亮**完全独立**，不能共用 class 名。

- 高亮面板相关 class：`#hlRailWrap` / `.hl-flyout` / `.hl-color-dot` / `.hl-style-btn` / `.pk-open`
- 小索引滚动高亮 class：`.mi-item.active`
- **禁止**让高亮面板的 hover 触发区域（`#hlRailWrap`）延伸到 mini-index 区域（之前 `padding-right:220px` 导致重叠误触发，已修复为移除 padding）

## 电子积木沙盒 (`tools/tool-blocks.html`)

图推板块的独立小工具（导航入口 `id: 'blocks', label: '图推·积木'`），基于 Three.js 搭建 5×5×5 编辑区 + 10×10×10 主场景的立体积木沙盒，用于图形推理题的空间还原练习。与 notebook/graphic/translate/quant 四个主力工具完全独立，不共享富文本标记系统，也未接入 Supabase 云同步。

- **本地 vendor 依赖，禁止改回 CDN**：Three.js r160（压缩版）与 `OrbitControls.js` 已下载到 `tools/vendor/three/`，页面顶部 importmap 指向本地相对路径（`./vendor/three/...`），不再从 `cdn.jsdelivr.net` 加载。这是修复"根本不能用"反馈的根因——importmap 原先硬编码 CDN 地址，一旦该域名在用户网络下不可达，`<script type="module">` 会静默整体加载失败，页面按钮全部可见但零响应，且没有任何报错提示。以后升级 three.js 版本也要下载覆盖 `tools/vendor/three/` 里的文件，不要图省事改回 CDN 链接。
- 三种编辑模式：选零件（点击加减方块/框选主场景零件）、改整块（点方块整体刷色）、改单面（点单个面刷色，`FACE_ORDER`/`hit.face.materialIndex` 对应贴图顺序）。
- 撤销/重做用整体快照方案（`serialize()`/`restore()`，非增量 diff），最多 100 步。`restore(json, keepSelId)` 第二个参数用于撤销/重做后尽量保留原来选中的零件（若该零件仍存在），避免每次撤销都要重新点选零件才能移动/旋转。
- **作品保存/读取**（IndexedDB，数据库 `yystudy_blocks_db`，表 `works`，`keyPath: 'id'`）：
  - 记录字段：`{ id, name, thumb(240px 宽 JPEG dataURL), data(即 serialize() 的 JSON 字符串), createdAt, updatedAt }`。
  - 主场景顶部「💾 保存作品」按钮：首次保存需输入作品名并直接新建；已加载某作品后再次保存会弹出「覆盖保存」（更新原记录，id 不变）和「另存为」（新建记录，`currentWorkId` 切到新 id）两个选项。保存按钮点击后禁用+显示"保存中…"，完成或失败后恢复，防止重复提交。
  - 「📂 我的作品」按钮弹出列表（缩略图 + 名称 + 保存时间），每条支持「加载编辑」「预览」「删除」。「预览」进入只读模式（`viewOnly` 标志），顶部出现黄色横幅，编辑区点击/完成零件/撤销重做/清空场景/移动旋转删除零件等所有写操作在对应函数入口处直接 `return`，横幅「退出预览」按钮解锁。
  - 全局 keydown 监听已加防护：焦点在 `INPUT`/`TEXTAREA`/`contenteditable` 内时不再触发方向键移动零件或图层切换（新增作品名输入框后必须有这层防护，否则输入名字时方向键会被劫持去移动零件）；`Escape` 优先关闭弹窗。
  - 云同步：该工具尚未接入 Supabase，作品数据目前仅本地 IndexedDB 持久化；后续如需跨设备同步可参考 `cloud-localstorage-sync.js`/`storage-polyfill.js` 的模式另行接入。

## 数据文件

- `data/quant-data.json` — 数量关系知识库（13 板块 / 33 分组 / 62 知识点 / 76 例题，89KB），是 tool-quant.html 的只读数据源。结构 `categories → groups → points`，point 字段：`id / tag / title / core / formula / bullets / examples(text+images) / tips / diagram(type+code)`。首次加载后自动将斜杠分数转为 `[[a/b]]` 堆叠格式并存入 localStorage。
- `data/raw-txt/` — **已删除**（commit `4889492`）。原为 22 个 PDF 提取中间文本文件，quant-data.json 是唯一数据源。

## 改动记录

详细的功能开发和 bug 修复记录在 `CHANGELOG.md`。每次会话完成后追加一条日期条目。

## Deploy

直接 push 到 `main` 分支，GitHub Pages 自动部署。没有 CI、没有构建、没有测试。

## Commit convention

中文 commit message，格式宽松，示例：`导航栏工具按钮字体统一为宋体（var(--serif)）`
