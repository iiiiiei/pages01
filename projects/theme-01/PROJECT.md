# 主题 01 · CRT 次元墙（iiiiiei.com 站点一期）

> 项目状态：构想探讨阶段；技术学习先行——[study/shader-se-clone/](./study/shader-se-clone/)（2026-09-15 完成并通过三阶段验证：SIGNAL 桌面 → 穿屏 INSIDE 绿色次元 → END 终章，FBO 链/选择性渲染/视锥匹配穿屏/噪声揭示全部跑通）
> 原始备忘录：[memos/](./memos/)（三份，永久存档）

## 站点精神内核（来自《关于网站的一些构想》）

> **我坚信生活是艺术的低语。**
> **I firmly believe that life is art's whisper.**

- **页面精神**：web 是一扇心灵的窗口，访客会留下些什么、获得些什么
- **彩蛋精神**：让喜欢的人感受到小心思（例：像素点阵时期加入俄罗斯方块）
- **内容形态**：类似社交媒体，随时更新，承载"心流"、"哲学思想"、生活灵感
- **长期野心**：web 里装载整个世界——自然、人文、社科

## 一期一会 · 核心机制（站级架构约束，2026-09-15 确认为 Shopify Editions 期刊制）

参照 **shopify.com/editions** 模式：**每一期主题与内容都不一样**（灵感驱动，主题+内容一体），另有一种形式存放历史所有出版过的 web（归档 index）。
→ 架构推论：根路径承载当前期，每期有主题命名（如 Editions 的 Everywhere / Renaissance / Horizons），历史期倒序归档（如 `/editions/`），每期是独立完整的沉浸体验。
→ Editions 实例参考：2022 夏起半年一期，至今 9 期，归档页倒序排列。

## 站点目标（2026-09-15 确认）

**做出 shopify.com/editions/spring2026、shader.se 级别的顶级视觉效果与交互 web，冲击 Awwwards 奖项。**
- 标杆战绩：Shopify Editions 系列多次获 Awwwards（Renaissance Edition SOTD 等）；shader.se（瑞典创意开发工作室）为 SOTD
- 当前阶段：**构想探讨期，不开工**——CRT 电视是灵感候选，未定稿

## 主题 01 构想：CRT 大头电视 · 次元墙（来自《主题灵感随手记》）

一台复古 CRT 大头电视是"跨次元入口"，滚动驱动镜头推入电视屏幕，形成两个次元：

**电视外（ASCII 次元）**
- 纯黑背景，ASCII 字符风格的世界（参考 tympanaus ASCIILogo）
- 一台风格迥异（吸睛）的大头电视在画面一角
- 鼠标是"光源"，以电视为中心发散 ASCII 风格的"阴影"区域（阴影计算参考 vercel.com、vgpu.sh）
- 开场占位页：鼠标光源 + 中心 CRT 复古抖动感文本（如 hello world，参考 codepen YzoWyqJ）

**电视内（CRT 次元）**
- 滚动平滑推入屏幕，穿过瞬间切换风格 = "次元墙"
- 四边与整个画面带鱼眼特效变形
- 横向扫描线 / 噪点 / 偶尔轻微抖动
- 复古像素感

**其他灵感（尚未归入具体方案）**
- 依据访客时区变换日照（如上海访客看到上海的一天，光影角度随真实时间变化）
- 英雄自由落体 + 玻璃幕墙背景（无限下坠感）

## 素材与参考清单

| 素材 | 用途 |
|---|---|
| shopify.com/editions | **期刊制架构原型**：9 期倒序归档 index |
| shopify.com/editions/spring2026 | 互动感标杆（"Everywhere"） |
| shopify.com/editions/winter2026 | 审美参考（"Renaissance"，Awwwards SOTD） |
| shopify.com/editions/winter2025 | 复古风 + 老电视（"Boring"） |
| Codrops：Spring '26 工程拆解 | **技术内幕**（tympanus.net/codrops，2026-06-26） |
| shader.se | 伪 3D、次元入口（瑞典工作室，Three.js，SOTD） |
| vgpu.sh | ASCII 阴影/光照计算 |
| tympanus.net/Tutorials/ASCIILogo | ASCII 风格世界 |
| codepen.io/fand/full/YzoWyqJ | 鼠标光源 + CRT 抖动文本占位页 |
| shaders.solaceui.com | Interactive shaders |
| vercel.com | 光源阴影计算 |
| Apple Music《黑键》专辑 | 用途待确认（BGM / 氛围参考？） |
| github.com/muraleph/glyphwork | ASCII/Unicode 程序化生成 |
| github.com/Cycatz/uniramp | 字符密度研究 |
| paulbourke.net/dataformats/asciiart | ASCII art 资料库 |

## 标杆工程内幕（Codrops 拆解 Shopify Spring '26 "Everywhere"）

- **混合架构**：DOM 承载内容/交互 + 单个全屏 WebGL canvas 承载氛围层（点云、体积光、滚动过渡）；Three.js + React Three Fiber
- **滚动即 uniform**：滚动位置直接驱动 shader uniforms，不进 React state；相机/过渡/位移在渲染循环内读 refs
- **体积光**：视频预处理为 KTX2 数组纹理 + raymarch（步数硬上限，防止性能悬崖）
- **透明视频**：上下堆叠存 RGB/alpha，WebGL2 着色器重建（绕开 Safari 原生 alpha 缺陷）
- **点云**：VGGT 从视频生成，自定义 .mdpc 格式（位置量化 + 色度压缩 + DecompressionStream），对象存 refs 不进 React state
- **共享流体场**：单一 FluidField 组件持有模拟，消费者采样速度纹理
- **性能**：四档设备分级（静态回退→最低 WebGL→减配→完整桌面）、DPR 按质量钳制、场景窗口化（仅挂载当前±相邻 section）
- **流程**：设计师 playground 与生产共用同一 preset schema，"调真实场景并直接上线同一份配置"
- **核心教训**：高端浏览器作品大多是管线工作（pipeline work）——先建工厂，再出产品

## 技术方向（2026-09-15 确认）

- **已定**：shader 驱动（WebGL，Three.js 为业界标杆验证的路线），Awwwards 级目标
- **待定**：站点框架（Astro 骨架 + WebGL 层，或 R3F 全家桶——取决于各期内容形态，Editions 用的是 R3F）

## 待确认问题

- [ ] 第一期的主题定稿（CRT 次元墙是候选灵感之一，用户仍在构想发展）
- [ ] 第一期内容：心流/哲学/灵感具体以什么形态呈现（文字/图像/声音/交互装置？）
- [ ] 《黑键》的用途
- [ ] 站点语言（座右铭已中英双语）
- [ ] "访客留下些什么"的交互形态（留言/痕迹/更多？）
- [ ] 站点框架：Astro + WebGL 层 vs R3F 全家桶（等第一期内容形态明确后定）
- [ ] 归档 index 的形式与 URL 方案（`/editions/`？每期一子路径？）
