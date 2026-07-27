# yystudy 项目背景（Project 知识库）

> 这份文件放在 Claude Project 里作为项目知识。
> 每次在这个 Project 里提问，Claude 会自动读它，不用重新解释项目。
> 有变化时直接修改这个文件重新上传即可。

---

## 一、这是什么项目

一套自建的**国考/省考备考学习工具集**，纯 HTML 单文件应用，
每个工具是一个独立的 `.html`，可以本地双击打开，也部署在 GitHub Pages 上。

**线上地址**：https://curly-hair-yy.github.io/yystudy/

**为什么自己做**：偏好拥有自己的工具，而不是用 Notion、语雀这类现成平台。

---

## 二、工具清单

| 文件 | 名称 | 内容 |
|---|---|---|
| `index.html` | 学习工具集 | 首页导航，跳转到各工具 |
| `tool-notebook.html` | 资料分析·错题本 | 43 个知识点，8 个分类 |
| `tool-memory.html` | 小分互换记忆卡 | 记忆卡片 |
| `tool-graphic.html` | 图推错题整理 | 图形推理，「文艺粉」皮肤的样板 |
| `tool-translate.html` | 翻译推理知识点整理 | 逻辑翻译推理 |
| `tool-blocks.html` | 电子积木沙盒 | 沙盒工具（唯一未接云同步） |

---

## 三、技术栈

- **前端**：纯 HTML + CSS + 原生 JS，单文件，无框架无构建
- **CSS**：用 CSS 自定义属性（`:root` 变量）做主题
- **数据存储**：浏览器 localStorage + Supabase 云同步
- **仓库**：GitHub `Curly-hair-yy/yystudy`，public，main 分支
- **部署**：push 到 main 后 GitHub Pages 自动发布，无 CI 无构建无测试
- **本地开发**：Safari 打开本地文件，无需服务器

### Supabase 配置

- 项目名 `yystudy`，Sydney 区
- 表 `app_data`，字段：`(id, tool_name, data_key, data_value jsonb, updated_at)`
- 唯一约束：`UNIQUE(tool_name, data_key)`
- 鉴权用 anon key
- upsert 用 `on_conflict=tool_name,data_key` + `resolution=merge-duplicates`
- 超大数据（如图推工具约 12MB 笔记）走分块同步

---

## 四、设计规范（重要）

这些是反复确认过的偏好，改任何样式都要遵守。

### 选中 / 激活状态

**只用粉色文字 + 加粗。禁止背景色块、边框、阴影。**

```css
/* ✅ 正确 */
.nav button.active { color: #E8317C; font-weight: 600; }

/* ❌ 禁止 */
.nav button.active { background: #FDEAF1; border-bottom: 2px solid #E8317C; }
```

### 配色（文艺粉主题）

| 变量 | 值 | 用途 |
|---|---|---|
| `--accent` | `#E8317C` | 品红，选中态、hover |
| `--accent-soft` | `#FDEAF1` | 浅粉（备用） |
| `--paper` / `--surface-alt` | `#F7F5F4` | 暖灰粉，导航栏、侧栏等非内容区背景 |
| `--surface` | `#FFFFFF` | 内容区背景 |
| `--ink` | `#171717` | 主标题 |
| `--ink-soft` | `#8C8C8C` | 次级文字 |
| `--ink-faint` | `#B9B9B9` | 弱化文字 |
| `--border` | `#EDEDED` | 分隔线 |

**非内容区不要用纯白 `#FFFFFF`**，会显得冷、跟暖调不搭。

### 字体

全站统一用 `--serif` 宋体栈，不要混用 `--sans`：

```
"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif
```

### 布局特征（图推工具）

- 左侧竖排导航轨（vertical rail）
- 粘性迷你索引侧栏
- 模块切换用飞出式菜单（flyout）

---

## 五、已知的坑

### 皮肤切换必须调 `renderAll()`

切换皮肤后如果不重新渲染，JS 动态生成的内容会残留上一套皮肤的样式和颜色。
这个 bug 犯过多次。

### 大文件不要读

图推工具的笔记数据约 12MB。让 AI 读它会瞬间烧掉大量 token，
而且跟改样式这类任务完全无关。搜索、查找时明确跳过 `data` 相关文件。

### 代码和数据是分开的

网页里录入的错题、笔记存在 localStorage 和 Supabase，**不在 html 文件里**。

- 改样式 → 只动代码，笔记不受影响
- `git push` → **不会备份笔记**，要定期用工具内的 JSON 导出功能单独存

### iCloud 存放的风险

项目目前在 iCloud 云盘里。iCloud 会把不常用文件卸载成占位符，
可能导致「文件在但读不到」，也可能同步坏 `.git`。
遇到读不到时：访达右键文件夹 → 立即下载。

---

## 六、功能特性（已实现）

- 三级数据层级：板块 / 分组 / 知识点
- 知识点结构化分区：公式 / 要点 / 例题 / Tips，标签可编辑
- 富文本编辑：加粗、变色、高亮、分数记法
- 多图上传：自动压缩 + 灯箱查看
- 拖拽排序
- 撤销/重做（25 步）
- JSON 导出/导入备份
- Supabase 云同步（除沙盒工具外全部接入）

---

## 七、工作流

### 日常修改流程

```
终端 → cd 进项目 → git 备份 → claude → 提需求 → 退出 → 看效果 → push
```

命令行用的是 **Claude Code + DeepSeek**（`deepseek-v4-pro`，API 按量计费）。
项目里有 `CLAUDE.md`，Claude Code 启动时自动读取上面那套设计规范。

### 在这个 Project 里我通常想要什么

**帮我把模糊的想法翻译成精确的 Claude Code 指令。**

我能判断「这个看着不对」，但说不清技术上该改什么。
理想的回复是给我一段可以直接复制进 Claude Code 的指令，包含：

1. 改哪个文件
2. 想要什么效果
3. 参照哪个已有的东西
4. 结尾加「先说方案，我确认后再改」

**不需要**你直接给我大段代码——那是 Claude Code 的活。

---

## 八、关于我

- CS/设计属于自学，靠 AI 辅助迭代积累了实践能力，但基础概念可能需要解释
- 视觉判断力好，但缺技术词汇。喜欢极简、排版驱动的设计，
  讨厌那种一眼能看出是 AI 生成的通用审美
- 沟通用中文，反馈简短直接
- 主观的审美取舍希望 Claude 自己判断，不要反复问我确认
- 正在备考国考，时间紧，方案要务实，别为了完美折腾

---

## 九、待办 / 注意事项

- [ ] Monash 学生邮箱即将停用，需要确认 GitHub、各类账号的绑定邮箱
      已改为 `yunshutingg@gmail.com`
- [ ] 考虑把项目从 iCloud 挪到 `~/Documents`，避开同步风险
- [ ] `tool-blocks.html`（沙盒）尚未接入 Supabase 同步
