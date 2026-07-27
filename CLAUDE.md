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
  quant-data.json   ← 数量关系知识库（13 板块 / 33 分组 / 62 知识点）
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

不要读取 `data` 相关的数据文件（存在 12MB 的笔记数据）——搜索、查找时跳过这些文件。

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

- `data/quant-data.json` — 数量关系知识库（13 板块 / 33 分组 / 62 知识点，89KB），是 tool-quant.html 的只读数据源。包含三级结构 `categories → groups → points`，每个 point 有 `id / tag / title / core / formula / bullets / examples / tips / diagram` 字段
- `data/raw-txt/` — PDF 提取中间文本文件（22 个 .txt，约 200KB），是生成 quant-data.json 的原始素材，量化工具已不再直接引用，可考虑清理

## Deploy

直接 push 到 `main` 分支，GitHub Pages 自动部署。没有 CI、没有构建、没有测试。

## Commit convention

中文 commit message，格式宽松，示例：`导航栏工具按钮字体统一为宋体（var(--serif)）`
