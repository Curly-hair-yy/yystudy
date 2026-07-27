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
  tool-blocks.html  ← 图推·电子积木沙盒
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

### 颜色调色板（统一 6 色）

| 色名 | 变量 | 色值 |
|------|------|------|
| 粉 pastel | `--hl-pink` | `#F8D3DE` |
| 黄 pastel | `--hl-yellow` | `#F9E9AE` |
| 绿 pastel | `--hl-green` | `#D3EAC4` |
| 蓝 pastel | `--hl-blue` | `#C6DCF6` |
| 米 cream | `--hl-cream` | `#F3EADA` |
| 玫红 rose | `--hl-rose` | `#FCD4D8` |

JS 常量：`HL_COLORS = ['yellow','green','blue','pink','cream','rose']`

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

6. **工具间颜色同步**：曾出现 translate 用一套颜色、quant/notebook 用另一套的情况。现统一为 6 色标准色卡，三个工具保持一致。新增颜色时需同步更新四个位置：CSS 变量、`HL_COLORS` 数组、`mark.hl` 背景类、`hl-ul`/`hl-wl` 属性选择器。

7. **批量脚本修改多文件后必须逐个验证语法**：曾用 Python 脚本给多个文件批量插入 `try/finally` 防重复提交代码，因文本匹配不精确，`tool-notebook.html` 出现了孤立 `finally` 块导致整个 JS 脚本解析失败、页面白屏。`tool-graphic.html` 当时被发现并修复了，但 `notebook` 被遗漏，直到用户反馈白屏才排查出来。教训：批量修改后必须对每个文件单独运行 `node --check` 验证 JS 语法，且要手动抽查关键函数的配对完整性（`try`/`catch`/`finally` 括号匹配）。

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

## 数据文件

- `data/quant-data.json` — 数量关系知识库（13 板块 / 33 分组 / 62 知识点 / 76 例题，89KB），是 tool-quant.html 的只读数据源。结构 `categories → groups → points`，point 字段：`id / tag / title / core / formula / bullets / examples(text+images) / tips / diagram(type+code)`。首次加载后自动将斜杠分数转为 `[[a/b]]` 堆叠格式并存入 localStorage。
- `data/raw-txt/` — **已删除**（commit `4889492`）。原为 22 个 PDF 提取中间文本文件，quant-data.json 是唯一数据源。

## 改动记录

详细的功能开发和 bug 修复记录在 `CHANGELOG.md`。每次会话完成后追加一条日期条目。

## Deploy

直接 push 到 `main` 分支，GitHub Pages 自动部署。没有 CI、没有构建、没有测试。

## Commit convention

中文 commit message，格式宽松，示例：`导航栏工具按钮字体统一为宋体（var(--serif)）`
