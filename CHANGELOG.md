# CHANGELOG

## 2026-07-27

- 新增 tool-quant.html（数量关系·知识点），数据源 22 份 PDF 讲义，13 板块/33 分组/62 知识点/76 例题，支持 SVG 和 Mermaid 图解渲染
- 新增左侧 rail 导航栏搜索浮层、撤销/恢复/橡皮擦独立图标入口
- 新增速查索引独立页面（卡片式布局），支持搜索过滤
- 新增平面图形公式表、立体图形公式表、余数/增长率/数列/相遇追及/植树问题等多张对照表格
- 新增平方数网格表，支持 4-5 列网格渲染
- 新增例题文本分段渲染（题干/选项/答案/解析），斜杠分数自动转堆叠分数 [[a/b]] 格式
- 新增字号调节功能（5 档，CSS 变量 --font-scale）
- 新增知识点编辑、错题录入功能，支持图片拖入上传
- 统一四工具高亮/下划线调色板为 6 色标准色卡（粉/黄/绿/蓝 pastel + 米 cream + 玫红 rose）
- 修复富文本高亮/下划线/波浪线标记 DOM 结构错误导致整行变色、字号变大、位置偏移的 bug
- 修复下划线颜色使用 inline style 导致浏览器解析不稳定的问题，改为 CSS 属性选择器 + data-hlc
- 修复小索引滚动高亮只亮最后进入视口的卡片而非阅读位置的 bug，改为 35% 视口基准线的阅读锚点判定
- 修复小索引滚动高亮 Observer 在卡片渲染前绑定导致功能完全不生效的 bug
- 修复高亮悬浮面板 padding-right 溢出与小索引区域重叠导致误触发的 bug
- 修复错题本/编辑保存按钮无 loading 状态导致用户重复点击产生多条重复数据的 bug
- 修复例题分段渲染在富文本序列化后回退粘连的 bug
- 修复分数解析函数 convertMathText 分母贪婪匹配导致 ) 泄漏进分母的 bug
- 修复 7 处 diagram 图示的 viewBox 尺寸不足、文字与图形重叠、线条穿透文字等问题
- 修复工具文件路径：tool-quant/notebook/graphic/translate 四个文件从 tools/ 移回项目根目录
- 修复 index.html 中 tool-memory 和 tool-blocks 的 tools/ 路径引用
- 新增 CLAUDE.md 项目规范文档，记录文件结构、设计规范、已知踩坑记录
- 清理 data/raw-txt/ 目录（22 个 PDF 中间提取文本文件，约 200KB）
- 性能优化：tool-graphic.html 图片从 JSON base64 迁移至 IndexedDB 独立存储，JSON 体量缩减 90%+
- 性能优化：tool-graphic.html Supabase 同步改为 fire-and-forget（后台异步，不阻塞 UI 响应）
- 修复 tool-graphic.html 保存按钮无 loading 状态导致重复提交的问题（tool-quant/notebook 同步修复）
---
- 修复取消加入错题本勾选后卡片操作按钮竖直堆叠的布局bug（note-actions改为横排）
- 修复错题本操作按钮布局回归问题（编辑/加入错题本或移出错题本/删除三项，已加入与未加入两种状态统一横排对齐），并将默认文字颜色从 --ink-faint 加深为 --ink-soft，悬停色改为 --accent 粉色
- 修复 tool-notebook.html 因批量脚本 try/finally 语法错误导致页面白屏的严重 bug（回退到干净版本后手动重做安全改动）
