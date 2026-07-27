# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

yystudy 是一个学习工具集（考试备考辅助），部署在 GitHub Pages，后端用 Supabase 做跨设备数据同步。没有构建步骤，纯静态 HTML/CSS/JS。

## Architecture

```
index.html          ← 工具集 Hub 页（可折叠导航栏 + iframe 容器）
cloud-localstorage-sync.js  ← localStorage 自动同步到 Supabase（透明拦截层）
storage-polyfill.js ← 为脱离 Claude Artifact 环境运行的工具提供 window.storage API
tools/
  tool-notebook.html   ← 资料分析·错题本
  tool-memory.html     ← 小分互换记忆卡
  tool-graphic.html    ← 图推错题整理
  tool-translate.html  ← 翻译推理知识点
  tool-blocks.html     ← 电子积木沙盒
fonts/
  ELEYANG-Soft-Bold.ttf  ← 工具内用作徽章/印章字体
  新海山峦.ttf
```

### Hub 页 (`index.html`)

- 顶部是可折叠 `<header>`：收起时显示一行"学习工具集 ▾"（`.header-peek`），hover/点击展开显示标题 + 工具标签按钮
- `<nav>` 里的按钮通过 JS 动态生成，点击在 `<main>` 中懒加载对应 `<iframe>`
- 用 `localStorage('hub-last-tab')` 记住上次打开的工具
- CSS 变量 `--serif` / `--sans` 定义字体栈，`--paper` / `--surface` / `--ink` / `--accent` 等定义颜色

### 数据同步层

- **`storage-polyfill.js`**：为原本在 Claude Artifact 里写的工具提供 `window.storage.get/set/delete/list`，云端优先，失败降级到 localStorage。通过 `data-tool` 属性做命名空间隔离。
- **`cloud-localstorage-sync.js`**：对直接使用原生 `localStorage` 的工具，拦截 `Storage.prototype.setItem/removeItem`，启动时用同步 XHR 拉取云端数据预填到 localStorage，之后每次写入做 800ms 防抖后异步同步到 Supabase。通过 `data-tool` 属性做命名空间隔离，可选 `data-exclude-prefix` 跳过特定 key（避免和工具自己的大数据同步机制打架）。

两类脚本在同一页面里只应引入一个，不能混用。

### 工具页设计约定

- 每个工具页是自包含的 HTML 文件，`<style>` 和 `<script>` 都写在同一个文件里
- 图推错题整理（tool-graphic.html）有两套皮肤：默认（蓝灰调）和粉调 `.skin-pink`，后者通过覆盖 CSS 变量切换，会将 `--font-sans` 重定义为 `"Noto Serif SC", serif` 让正文变宋体
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

## Deploy

直接 push 到 `main` 分支，GitHub Pages 自动部署。没有 CI、没有构建、没有测试。

## Commit convention

中文 commit message，格式宽松，示例：`导航栏工具按钮字体统一为宋体（var(--serif)）`
