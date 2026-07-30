# CHANGELOG

## 2026-07-30

- 修复 tool-quant.html 遗留的表格渲染问题，逐个实际打开知识点核对后再动手改，未凭猜测：
  1. `renderShapeFormula()`（约 998 行）入场早退条件 `if(!/[一-鿿]{2,4}[：:]/.test(formula)) return fracRender(formula);` 要求内容里必须先出现"中文词+冒号"，而 p_pingfangshu 的 formula 是纯数字加 `|`/`||` 分隔、完全没有冒号，被这行直接挡在门外。改成 `if(!formula.includes('||')&&!/[一-鿿]{2,4}[：:]/.test(formula))`，让含 `||` 的内容也能继续往下走判断。核对过全库唯三个含 `||` 的 formula 字段（p_dengcha_dengbi / p_pingfangshu / p_rc_daigongshi），另外两个本来就有"项目：..."匹配得到中文词+冒号，改动不影响它们，零回归风险。
  2. 排查过程中发现 p_pingfangshu 表格实际不渲染的直接原因并不是这条早退逻辑本身（那条判断在真正的 fresh load 下完全正确），而是当天早些时候给 tool-quant.html 接入 `cloud-localstorage-sync.js` 做同步验证测试时，测试用的浏览器环境里 `DATA` 对象不知从哪个环节混入了真实换行符，把 `p_pingfangshu`/`p_dengcha_dengbi`/`p_rc_daigongshi` 三个 formula 里所有的 `||` 拆成了 `|\n|`，测试编辑保存时把这份被污染的数据当成"用户的真实修改"同步到了 Supabase 云端——用同一套 loadData() 管线反复用干净的全新 fetch 复现两次均无法重现这个换行，确认不是当前代码逻辑的 bug，而是那次测试会话独有的一次性数据污染；已用干净的重新 loadData() 结果覆盖回云端，云端现在三个字段均确认不含换行。
  3. 把 `patchFormulaFields()`（约 843 行）的比对方式从"猜一个旧版本文本去比对、猜对了才覆盖"改成"只要当前内容不等于 quant-data.json 里定义的最新版本就直接强制覆盖"——上一次给 p_rc_daigongshi 猜的旧文本本来就和实际缓存内容对不上，补丁完全没生效。这三个知识点的公式都是有唯一正确答案的客观事实，不太可能是用户手动编辑出一个"像旧版但其实是自己写的"内容，强制收敛更可靠，也顺带能自愈类似第 2 条那种意外混入的缓存损坏。
  4. 新增知识点 p_zhengchu_teshu（整除，利用整除特性解纯整除问题）的 formula 原来用"→"箭头分隔（如"3→各位数字和是3的倍数"），触发不了冒号 kv 表格解析。已在 `data/quant-data.json` 里改成冒号分隔的两列表格格式（"项目：判定方法；3：各位数字和是3的倍数；..."），并把它也加入 `patchFormulaFields()` 的强制收敛列表，确保已经缓存过旧箭头格式的设备/浏览器下次加载也能自动迁移到新格式，不用等用户手动清缓存。
  5. `.formula-table .ft-formula`（公式单元格）字体从 `var(--serif)` 改成 `var(--mono)`（和同一张表的表头字体保持一致，此前表头/表身字体不统一），并针对表格内的 `sup`/`sub`/`.frac` 单独加了字号、字距、外边距的微调，让上标下标不再挤在一起；改动只加在 `.formula-table .ft-formula` 这个选择器范围内，没有碰全站的 `sup,sub{...}` 全局规则，也没有动 CLAUDE.md 里要求统一 `--serif` 的其它任何地方。
  - 全部改动在浏览器里逐个实际打开了 整除/等差等比/平方数/容斥 四个知识点核对，确认表格结构、内容、字体都正确渲染（截图确认二列对照表、平方数网格表、容斥两组对照表均正常）。
- 新增 tool-quant.html「速查索引」和「目录」两个页面的知识点拖拽排序功能，复用知识点内部内容块拖拽排序的同一套视觉/交互约定（⠿ 手柄图标、hover 才显示、拖拽时半透明、落点用 box-shadow 高亮），限定在同一模块（分组）内调整知识点顺序，不支持跨模块拖拽（已用真实拖拽事件验证：跨模块拖拽会被直接忽略，两侧顺序都不变）：
  - 速查索引页：每个知识点条目（`.index-point-item`）左侧新增 hover 显示的拖拽手柄，横向布局按左右半区判定插入位置（复用 `.catpill` 那种左右拖拽的视觉），拖拽时同步保留搜索过滤的显示/隐藏逻辑。
  - 目录页：每张知识点卡片标题区新增拖拽手柄，纵向布局按上下半区判定插入位置。
  - 排序结果写回 `g.points` 数组并调用已有的 `saveData()`，和刚接入的 `cloud-localstorage-sync.js` 走同一条 `localStorage.setItem` 拦截路径同步到云端，没有另起同步机制；同时接入撤销栈（`pushUndo()`），Ctrl+Z 可撤销排序操作。
  - 用页面内直接派发 `DragEvent`（`dragstart`/`dragover`/`drop`/`dragend`，携带真实 `DataTransfer`）而不是模拟鼠标拖拽的方式验证了拖拽逻辑本身（在这个沙箱浏览器环境里用鼠标模拟真实拖拽不稳定），覆盖了：同模块内前移/后移、撤销恢复、跨模块拖拽被正确拒绝、`localStorage` 落盘、真实刷新页面后顺序保留；测试用的顺序调整验证完之后已撤销/恢复成 quant-data.json 原始顺序，云端未留测试痕迹。
- **事故记录**：上面接入 `cloud-localstorage-sync.js`／排查表格渲染问题这两轮测试，都是在本地空白测试浏览器（localStorage 从零开始）里进行的，测试过程中做的编辑（哪怕后来撤销/清空了）会经由 `saveData()` 把整份 `DATA` 推到 Supabase 云端——而这个云端存储位置和用户真实浏览器共用同一个 `tool_name=quant` 记录。云同步的设计是"每次打开页面都无条件用云端数据覆盖本地"，所以用户真实浏览器下次打开时，本地已有的真实编辑内容被这份"空白测试用户"产生的云端数据覆盖掉了，用户反馈"编辑的内容不见了，回到了最初的样子"。用户提供了 2026-07-29 19:34 导出的备份文件（`数量关系_备份.json`），比对确认这份备份完整包含了丢失前的真实编辑（例如"工程问题"板块 4 个知识点，用户把"核心"总结句拆成了多条要点，其中一条还带高亮标记）。恢复方式：加载备份 → 对其运行 `migrateAllRichText`/`patchFormulaFields`（后者补上表格渲染修复，前提是这两个修复对内容字段本身零侵入，只覆盖 formula 字段）→ `saveData()` 推回云端；恢复后逐点比对备份与云端最终内容，62 个知识点里只有那 4 个被有意打表格补丁的 formula 字段不同，其余字段（含高亮标记）逐字一致。**教训**：以后测试任何会写入这个共享 Supabase 端点的功能，一律先在测试脚本里拦截 `fetch` 里对 `supabase.co` 的写请求（POST/DELETE），只放行 GET，确保测试环境的编辑/撤销/回退动作不会真的落到生产数据上；确需验证"真的能同步到云端"这类端到端行为时，再有意识地临时放开、测完立刻用真实内容核对云端并按需恢复。本次新增「大模块拖拽排序」功能验证时已用这种 fetch 拦截方式全程测试，云端全程未受影响（用户后续用点级拖拽功能自行调整过"容斥问题"分组下两个知识点的顺序，属于真实操作，已核实并非本次测试引入）。
- 新增 tool-quant.html「目录」flyout 菜单（左侧导航栏点开"目录"按钮弹出的板块列表）里的板块（大模块，如"工程问题""容斥问题"）拖拽排序功能：整个板块按钮本身设为可拖拽（沿用 `tool-notebook.html` 里 `.catpill` 的写法，不额外加 ⠿ 手柄，因为按钮本身还要承担"点击切换板块"的职责），纵向按上下半区判定插入位置，落点同样用已有的 `drop-before`/`drop-after` box-shadow 高亮。排序结果直接调整 `DATA.categories` 顶层数组顺序，「速查索引」页因为是直接遍历这个数组渲染的，顺带自动跟着调整，不用额外同步逻辑；接入撤销栈，和点级拖拽走同一条 `saveData()` 持久化/云同步路径。用拦截 Supabase 写请求 + 派发真实 `DragEvent` 的方式验证：拖拽后数组顺序、DOM、`localStorage`、速查索引页四处一致，点击切换板块的原有功能不受影响，撤销可恢复原顺序，测试期间生产云端数据全程未被写入（已核实）。

## 2026-07-29

- 排查 tool-graphic.html 图片补传（`backfillImagesToCloud`）是否真的执行过：直接查 Supabase 发现 `tool_name=graphic` 下 `tuitui-img__*` 一条都没有，但 `tkimg_cloud_backfilled` 完成标记却已经是 `'1'`——对比时间戳发现这个标记是在补传功能那次提交（`da840a9`，当天 19:21:06 本地时间）**之前**几分钟就被写入云端的，说明当时是在一个本机 IndexedDB 里没有真实图片的空环境（例如测试用的浏览器）里跑过一次 `init()`，`backfillImagesToCloud()` 扫到 0 张本地图片就直接把"已完成"标记写了下去。这个标记同样会被 `cloud-localstorage-sync.js` 当成普通 localStorage key 全量同步（`data-exclude-prefix` 只排除了 `tuitui-notes`，没排除这个 key），意味着往后不管谁在哪个设备打开页面，只要云端有这条"已完成"记录，`cloud-localstorage-sync.js` 启动时的预拉取就会把这个假的"已完成"状态灌回本地，`backfillImagesToCloud()` 一看标记已存在直接 return，真正持有图片的那台设备再也没有机会触发真实补传——这是一个会一直卡住的死锁,不是"还没跑过"那么简单。已从 Supabase 删除这条错误标记（`tool_name=graphic&data_key=tkimg_cloud_backfilled`），确认删除后云端该 key 不存在；后续验证优化项时用沙箱浏览器又误触发了一次同样的空跑，已再次清除并确认为最终状态。真正的补传需要用户在持有本地老图片的那台 Chrome 里重新打开一次 `tool-graphic.html` 才会执行；如果那台 Chrome 此前也曾打开过页面并把这条假标记同步下去过，需要额外在该浏览器 devtools 里执行一次 `localStorage.removeItem('tkimg_cloud_backfilled')` 再刷新，标记才会真正清零。
- 优化 tool-graphic.html 图片加载并发性能：`idbRenderImgs`（原 for-of 循环逐个 await）和 `hydrateImgPlaceholders`（原 for-of 循环逐个容器 await）此前都是串行处理，图片一多、尤其是本地 IndexedDB 没有缓存必须逐张查云端时（比如 Safari 这种从未缓存过的场景）会明显变慢。新增 `cloudGetImages(ids)` 用 PostgREST 的 `data_key=in.(...)` 语法把多个 id 的云端查询合并成一次请求（超过 80 个自动分批、分批之间仍并发），新增 `idbGetLocalMany`/`idbGetMany` 把本地 IndexedDB 并发查询 + 云端批量兜底封装成一套统一逻辑（内存缓存命中的直接跳过，本地未命中的并发查 IndexedDB，IndexedDB 也没有的才合并成一次云端请求，查到后各自异步写回本地缓存不互相阻塞）；`idbRenderImgs` 和 `hydrateImgPlaceholders` 都改造成先收集这一批要渲染的全部 id（`hydrateImgPlaceholders` 更进一步：把同一次渲染里**所有容器**涉及的 id 合并到一起）、调用一次 `idbGetMany`，再把结果同步分发回每张图/每个容器，而不是原来那种一个 id/一个容器等一次的写法。顺带给 `idbOpen()` 加了连接复用（`_idbConnPromise`），避免并发发起的多个 IndexedDB 读写各自重新 `indexedDB.open()`。用页面里临时插入的 6~9 张测试图片（`e2e_test_*`/`e2e_chrome_*` 前缀，验证完已从云端和本地 IndexedDB 清除，未污染真实数据）在 Browser 面板（模拟本地无缓存、必须查云端的冷启动场景，对应用户真实反馈里 Safari 的情况）和真实 Chrome（冷启动 + 页面刷新后二次读取的热缓存场景）里分别用拦截 `window.fetch` 的方式验证：冷启动时无论是单容器 6 张图还是 3 个容器共 9 张图，都只发出 1 次 Supabase 请求（而不是 6~9 次）；本地已有缓存（IndexedDB 命中或内存缓存命中）时 0 次网络请求；本地/云端各有一部分缓存的混合场景下，只会为缺失的那部分 id 发一次批量请求；所有场景图片都能正确渲染，两个浏览器都没有出现报错或变慢。当前 Supabase 上 `tool_name=graphic` 还没有任何真实 `tuitui-img__*` 记录（见上一条），所以这次验证用的是构造出来的测试图片，还没能用真实用户图片数据量走一遍完整流程，后续等真实补传成功后建议再抽查一次实际加载速度。

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

- tool-quant.html 接入 `cloud-localstorage-sync.js`（`data-tool="quant"`），补上此前唯一仍是纯本地存储的主力工具的 Supabase 云同步缺口。`STORE_KEY='quant_data'` 走原生 `localStorage.getItem/setItem`，与脚本的拦截方式完全匹配，无需 `data-exclude-prefix`；顺带带上的 `quant_theme`/字号偏好 key 体积很小，一并同步不构成负担。同步策略沿用脚本已有的"启动时用同步 XHR 拉云端数据预填 localStorage，之后写入防抖 800ms 异步推云端"机制，未另外发明合并逻辑；由于接入前云端该 tool_name 下没有任何数据，不存在"云端空数据覆盖本地已有编辑"的风险，首个打开页面的设备会把本地数据推上云，之后设备互相同步。用本地静态服务器 + 两个独立浏览器（Browser 面板 + Chrome）做了双向验证：分别在两端修改同一知识点内容并观察对方刷新后能看到变更，两个方向都确认生效后清理了测试标记数据，云端未留痕迹。同步更新 CLAUDE.md 里"当前同步状态"表格，去掉 tool-quant.html 仅本地存储的旧状态说明。

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
