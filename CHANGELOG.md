# CHANGELOG

## 2026-07-29

- 修复 tool-quant.html 三个知识点表格不渲染的问题（数列「等差/等比数列公式与性质」、「熟记常见平方数速判」、容斥「代入公式：总人数-圈外部分=总人次-重复部分」）。真正的根因是 `renderShapeFormula()`（约 909 行起）里"名称：值"三行以上→通用2列对照表"这条分支，在判断前会先对整个 formula 做一次全局按分号（；/;）拆分，完全没考虑 `||` 分组分隔符；只要 `||` 两侧内容各自都满足"名称：值"结构，就会把 `||` 两侧的内容揉成一份 kvRows 直接返回一张扁平表，两组之间还会发生表头/表尾粘连（形如"…a~i~||项目：等比数列"），根本走不到后面本该命中的"`||` 分组多组对照表"分支——这段分组表逻辑此前是完全无法触达的死代码。同理，纯网格表（无冒号，用 `||` 分组、`|` 分隔格子，如平方数表）的数据其实早就是对的，但函数最开头 `if(!/[一-鿿]{2,4}[：:]/.test(formula)) return fracRender(formula)` 这条早退判断只认"中文+冒号"模式，对没有冒号的纯网格公式直接提前返回纯文本，网格判断分支同样永远走不到。修复方式：把"纯网格表"判断和"`||` 分组对照表"判断都挪到函数最前面、任何早退判断之前，`||` 优先于其它单表启发式；删除两处因此变得不可达的旧重复代码。三个知识点里，数列和容斥两个点的 formula 字段本身也需要重新组织内容分组（数列点原来是按"通项公式/求和公式/中项性质"分组、每组塞等差+等比两行导致交替粘连，改成按"等差数列/等比数列"分组、每组内部 3 行；容斥点内容原来只在 bullets 里、formula 字段是另一套不相关的通用公式，改成两个圈/三个圈对照表），并把下标从 Unicode 下标字符（如 aₙ、a₁、qⁿ⁻¹）统一换成项目已有的 `~text~`/`^text^` 富文本语法（Unicode 下标字符本身就是导致脚标特别拥挤看不清的原因）；平方数表的 formula 字段本身已经是正确格式，未做改动。改动前逐一读取了 quant-data.json 里三个知识点的准确原文并核对系数/字母无误，未凭截图臆测覆盖。改完在浏览器里实测三个知识点，表格、分组、脚标均渲染正常，且对数据集里其余 34 个带 formula 字段的知识点做了回归检查（无 `||` 的公式代码路径完全未变，0 处渲染异常/报错）。
- 补充修复 tool-graphic.html 图片跨浏览器同步：给 `idbPut` 加 Supabase 上传（见前一条改动记录）之前，`state.notes` 里已经有一批图片通过日常编辑保存的路径（`saveAdd` 处理 `pendingImages` 时调用旧版只写本地的 `idbPut`）提前变成了 IndexedDB key，这批图片从来没有上传过云端，导致换浏览器/换设备依然看不到（Chrome 有图、Safari 没有）。新增一次性补传 `backfillImagesToCloud()`：用独立标记位 `tkimg_cloud_backfilled`（不复用 `IDB_MIGRATED_KEY`，避免和已有的 base64→IDB 迁移逻辑冲突），启动时扫描 `state.notes` 里所有 `note.images`（复习卡片的图片取的就是同一份数据，不用另外扫），挑出非 `data:` 开头的 IDB key，本机 IndexedDB 里确实存在的调用 `cloudPutImage` 补传一次；不阻塞 UI，扫描/上传都是后台异步，单张失败只 `console.warn` 不影响其它张，全部处理完才落标记位。同时把 `idbGet` 里的本地读取逻辑抽成 `idbGetLocal()`，供补传函数复用，避免绕道 `idbGet` 的云端兜底逻辑造成"先从云端查到、再原样传回云端"的空转。用真实生产数据核对过：全库 126 条笔记、107 条带图，其中只有 11 张是补传前就已经变成 IndexedDB key 的老图片，这次补传最多产生 11 次 POST 请求，规模很小，不构成限流风险。

- 修复 tool-blocks.html（电子积木沙盒)"根本不能用"反馈:根因是 three.js/OrbitControls 通过 importmap 硬编码指向 cdn.jsdelivr.net,一旦该 CDN 在用户网络环境下不可达(无 fallback、无报错提示),整个 `<script type="module">` 静默加载失败,页面按钮全部可见但零响应。已将 three.js r160(压缩版)与 OrbitControls.js 下载并 vendor 到 `tools/vendor/three/`,importmap 改为指向本地相对路径,彻底去除运行时 CDN 依赖
- 实测走查选零件加减方块、拖拽转视角、图层切换、完成零件进入主场景、主场景拖动/方向键移动/旋转零件、改整块/改单面刷色、撤销/重做/截图/清空场景等全部交互均正常;顺带修复一个真实 bug——撤销/重做(`restore()`)此前无条件清空当前选中零件,导致每次撤销后都要重新点选零件才能继续移动/旋转,现改为撤销/重做后若该零件仍存在则保留选中状态
- 新增"保存作品"/"我的作品"功能:主场景新增💾保存作品、📂我的作品按钮;保存时序列化整个场景(零件位置/朝向、每个方块坐标+颜色+图层信息,复用已有的 `serialize()`/`restore()` 撤销栈数据结构),支持"另存为"(新建记录)和"覆盖保存"(更新当前作品)两种方式,首次保存必须先输入作品名;保存按钮点击后禁用并显示"保存中…",完成/失败后恢复,防止重复提交
- 数据存储方案:参考 tool-notebook.html 图片曾经直接塞 JSON 导致越来越卡的教训,作品数据(含缩略图 dataURL)存入 IndexedDB(`yystudy_blocks_db` / `works` 表),不占用 localStorage;tool-blocks.html 目前未接入 Supabase 云同步,云端同步留作后续可选项
- "我的作品"列表展示缩略图(主场景渲染帧裁切为 240px 宽 JPEG)、作品名、保存时间,每条支持"加载编辑"(替换当前场景,可继续编辑)、"预览"(只读模式,顶部黄色横幅提示,锁定编辑区点击/完成零件/撤销重做/清空场景/移动/旋转/删除零件等一切写操作,点"退出预览"解锁)、"删除"(确认后从 IndexedDB 移除,若删除的是当前加载作品则清空顶部作品名标签)
- 全局 keydown 监听增加输入框/Escape 守卫:此前方向键/Ctrl+Z 快捷键不区分事件来源,若焦点在文本输入框(如新增的作品名弹窗)内会被错误拦截、劫持光标移动;现在文本输入焦点下直接放行,Escape 优先关闭弹窗
- 修复 tool-graphic.html「我的补充/错题本」图片裂图的 bug:图片存储早已迁移到 IndexedDB(`idbPut`/`idbGet`,数据库 `tkimg`),`note.images` 数组存的是 IDB key 而非真实地址,但 `noteCardHtml()` 笔记卡片和复习卡片背面这两处渲染代码仍把 key 直接当 `<img src>` 用,导致裂图;已改为先同步渲染空的 `[data-img-ids]` 占位容器,DOM 挂载后用新增的 `hydrateImgPlaceholders()` 复用已有的 `idbRenderImgs()` 异步解析出真实 dataURL 再填入(同时兼容未迁移的 `data:` 旧数据),并把点击放大灯箱的绑定一并挪到图片真正插入之后,避免灯篮点开也是裂图。顺带修复编辑笔记弹窗里图片预览区(`renderImagePreviews()`)同样直接拿 IDB key 当 src 的裂图问题。已用真实数据（127 条笔记中 107 条带图，含 data: 旧格式与 IDB key 混合）验证：笔记卡片、复习卡片、编辑预览三处均正常显示且可点击放大；另发现少量 IDB key 在当前浏览器里查不到对应数据，根因见下一条
- 修复 tool-graphic.html 错题/补充图片"换设备看不到"的问题：图片数据此前只存本地 IndexedDB，从未上传 Supabase，只有图片 ID 跟着笔记文字同步，图片本质是"设备本地"的。参考现有笔记的分块同步模式（`loadNotes`/`saveNotes`，`app_data` 表 + `CHUNK_PREFIX`），新增图片专用云端读写：`cloudPutImage`/`cloudGetImage`，`data_key` 前缀 `tuitui-img__` + id，同一张 `app_data` 表，`tool_name` 仍是 `graphic`。`idbPut` 改为本地写完（`await`，调用方立即可用）后再后台异步 `cloudPutImage`（不 await、不阻塞 UI，失败只 console.warn）；`idbGet` 改为本地查不到时（大概率是别的设备上传的图，本机从没缓存过）再查一次 Supabase，查到后用 `idbPutLocal`（不触发再次上传）写回本地缓存。`migrateImagesToIDB()` 迁移旧 base64 图片时调用的也是 `idbPut`，因此顺带自动获得云端同步，无需额外改动（但该函数目前从未被调用，是历史遗留的死代码，这次未激活，仅顺带修好其行为）。已用真实 Supabase 数据验证完整链路：新增带图笔记 → 确认图片上传到 `app_data` 表 → 手动清空本地 IndexedDB 缓存模拟"换设备" → 重新渲染确认图片从云端拉回并正确显示、同时写回本地缓存 → 测试数据全部清理（本地 + 云端，未留测试脏数据）。图片大小几十到上百 KB，多图上传/下载互不等待、一张失败不影响其它张

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
- 加深 tool-graphic.html 知识点描述文字(.module-sub)和左侧导航文字(.mi-item)颜色，从 #8C8C8C 调至 #6B6B6B，提升可读性
- 新增薄荷绿主题皮肤（设置菜单「🎨 切换皮肤」），强调色 #158F6D 翡翠绿，提示框背景 #9DF2E8 薄荷蓝，其余变量复用文艺粉
- 根据后续反馈，错题本操作按钮（编辑/加入错题本或移出错题本/删除）最终改回竖排三行、左对齐、行间距 8px（推翻了上一条"统一横排对齐"的方案）
- 修复 tool-translate.html 高亮/下划线悬浮面板永远不显示的 bug：面板 DOM 上残留 `hidden=""` 属性，浏览器对 `[hidden]` 元素套用 `display:none` 且优先级高于任何 opacity/visibility 过渡，导致 CSS 的 hover/open 显示规则永远生效不了；JS 的 toggle 逻辑也从未处理过这个属性。以后排查"悬浮/弹出面板不出现"类问题，先检查元素本身有没有 `hidden` 属性或 `display:none` 的内联样式，不要只查 hover/opacity 相关 CSS 规则
- 颜色方案改为以 tool-translate.html 的原始调色板为准：薄荷绿 #CFE9E2、雾玫瑰 #FCD4D8、奶油色 #F3EADA、卡其色 #EDDAC9 + 新增蓝色 #C6DCF6，共 5 色，替换此前"6 色"方案（黄/绿/蓝/粉/米/玫红），统一应用到 tool-quant.html、tool-notebook.html、tool-translate.html（tool-graphic.html 未接入高亮功能，未改动）；已保存数据里的旧色名（yellow/green/pink）自动映射到新色（khaki/mint/rose），不会丢失颜色
- 调整薄荷绿主题配色：accent 改为柔和灰绿 #9CC8C1，tip-bg 改为浅雾蓝 #D6EEF2，废弃之前偏鲜艳的翡翠绿方案
- 确定薄荷绿主题最终配色（v2）：accent #73AE52（苹果青，柔和草绿），tip-bg #FBF1D7（奶酪色，暖米黄调）。修复 pt-tips 提示框背景变量引用从 --accent-soft 改为 --tip-bg，让 --tip-bg 变量真正生效。同步更新派生变量 --accent-soft/#E6F2DF、--tip/#73AE52、--coral/#73AE52、--coral-bg/#E6F2DF
- 薄荷绿主题最终三色方案：accent #81B77B（鼠尾草绿 Basil Dew），tip-bg #E5F7A9（浅黄绿 Glass Lime），新增 --accent-hover #C7F7FF（浅青蓝 Soda Bubble）。12 个 hover 规则从 color:var(--accent) 改为 color:var(--accent-hover)，形成「常态鼠尾草绿 → 悬停浅青蓝 → 提示框浅黄绿」三色层次。:root 定义 --accent-hover:var(--accent) 确保文艺粉皮肤悬停行为不变
- 薄荷绿皮肤回归青苹果绿方案：accent 回到 #73AE52，accent-hover 与 accent 同色 #73AE52（悬停不再变色），tip-bg 改为同色系浅绿 #D8ECCE（一定要浅）。派生变量 --accent-soft:#E2F1DA、--tip:#73AE52、--coral:#73AE52、--coral-bg:#E2F1DA
- 调整薄荷绿主题 tip-bg 为浅色渐变：linear-gradient(135deg, #F3FAF8 → #C9E6E2)，替代之前的纯色/旧渐变方案。卡片操作按钮蓝色 #5D9BEC 保持不变
- 编辑框改为自动增高：所有 textarea（公式内容、要点、Tips、例题内容、错题内容等）监听 input 事件自动调整高度（height=auto → height=scrollHeight），去掉内部滚动条（overflow-y:hidden + resize:none），设置 min-height 避免空框过矮。showModal() 和 renderExList() 两处均触发初始高度计算
- 修正薄荷绿主题 tip-bg 渐变颜色与方向：linear-gradient(135deg, #91C1B9 → #DEF0ED)，左深右浅
- 薄荷绿主题改回纯色：accent #9CC8C1（中调青绿），tip-bg #D6EEF2（浅蓝绿），accent-hover #C7F7FF（浅青蓝），清理所有渐变残留
- 补齐数量关系工具浏览页头装饰分隔线
- 统一板块大标题字体为无衬线黑体
- 统一悬停色与 accent 一致：薄荷绿 --accent-hover 从 #C7F7FF 改为 #9CC8C1，hover 和 scroll-active 颜色统一：新增 --sans 变量（PingFang SC / Hiragino Sans GB / Microsoft YaHei），.group-head h2 从 var(--serif) 改为 var(--sans)，weight 800→700，与浏览页头视觉统一：pk-waveline（repeating-linear-gradient + var(--accent-soft)），速查索引和浏览页两处均添加，颜色自动跟随主题变量
