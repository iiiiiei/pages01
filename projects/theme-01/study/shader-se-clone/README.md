# Study: shader.se 管线复刻

> 技术学习副本。灵感来自 [shader.se](https://www.shader.se/)（Shader Development Studio）的公开架构，
> 代码与文案均为本工作区原创，未搬运原站任何资产。非官方、无关联。

## 原站是怎么做的（来源：作者公开的文章）

Filip Kantedal 与 Simon Hedlund（shader.se 创始人）在 Codrops 发表过两篇：

1. [80s Business Tech and Seamless Scene Transitions: Inside Shader.se's Scroll-Driven WebGPU Pipeline](https://tympanus.net/codrops/2026/05/19/80s-business-tech-seamless-scene-transitions-inside-shader-ses-scroll-driven-webgpu-pipeline/)（2026-05-19，案例研究）
2. [Building an Infinite Liquid Glass Grid with Three.js, WebGPU, and TSL](https://tympanus.net/codrops/2026/09/08/building-an-infinite-liquid-glass-grid-with-three-js-webgpu-and-tsl/)（2026-09-08，教程）

**原站技术栈**：Next.js + Three.js / React Three Fiber + TSL（一份节点材质编译到 WebGPU 与 WebGL 双后端）+ Lenis（平滑滚动，改造出页面吸附）+ @pmndrs/uikit（canvas 内类 DOM UI，为通过 WebGPU 管线而 fork 支持）。

**核心管线思想**（本副本的学习对象）：

| # | 思想 | 原站做法 |
|---|---|---|
| 1 | 选择性场景渲染 | 页面分段配置（type+length），Lenis 每帧给滚动位置；视野外页面整段跳过渲染——零 draw call、零 GPU 工作 |
| 2 | FBO 场景链 | 场景按页序**倒序**渲染，每个场景接收"下一场景"的帧缓冲纹理作为输入，逐级下传，第一场景输出进最终合成 pass |
| 3 | 渲染偏移 | 页面激活范围向前后微扩，保证过渡需要采样下一场景时 FBO 已就绪 |
| 4 | 控制反转 | 不用 useFrame（"parent-blind"），每个场景用 useImperativeHandle 暴露 `render(state, nextSceneTexture)`，父级单一循环编排，场景互不知晓 |
| 5 | 屏幕空间采样过渡 | 过渡材质按 fragment 的屏幕坐标采样下一场景纹理（而非 UV），揭示体可以是 3D 空间里任意形状 |
| 6 | 视锥匹配穿屏 | 相机不飞向固定 z；`fitCameraToScreen` 读屏幕 mesh 的世界位置/缩放/法线，算出恰好覆盖该平面的距离，再乘 0.92 防边框穿帮 |
| 7 | 后处理 | 最终合成：film grain + 色差 + bloom；作者称大量时间花在调动画的"重量、时机与个性" |

## 本副本实现了什么

- ✅ 三场景倒序 FBO 链（Hero → Inside → End）+ 最终 compose pass
- ✅ 选择性渲染 + 渲染偏移（范围外场景跳过整段渲染）
- ✅ 视锥匹配穿屏（`fitCameraToScreen`：滚动推进相机飞进 CRT 屏幕，屏幕内容即下一场景 FBO）
- ✅ 屏幕空间采样 + 噪声阈值揭示（Inside → End 过渡）
- ✅ CRT 质感：凸面 UV 变形、扫描线、grain、色差、vignette、穿屏闪断（黑幕 dip）
- ✅ **两个次元两套现实**：屏幕外 = 卓别林黑白胶片（黑白 · 高对比 · 大颗粒 · 划痕 · 灰尘 ·
  曝光闪烁 · 片门抖动，compose `filmGrade` + `uFilm`）；穿幕黑幕顶点瞬间爆出彩色（绿野仙踪式
  开关，`uFilm = 1 - smoothstep(0.40, 0.49, p)`），DOM 覆盖层同步灰度/恢复
- ✅ **开机 loading 页**：CRT 终端风（品牌标识 + 字符块进度条 `████░░` + 状态文案 + 扫描线），
  完成后 CRT 关屏动画（竖压成亮线）交棒给主场景
- ✅ **404 点彩彩蛋**（`404.html`）：致敬 OpenAI 超级碗广告的点阵语言——黑底白点聚散成象，
  四幕 "the first …" 小史（404 迷路 → 信号中断 → 默片卓别林 → 回家的门），鼠标推开星群，
  点击旋涡吸回主页；零依赖 Canvas 2D
- ✅ Lenis 平滑滚动驱动一切；`prefers-reduced-motion` 降级
- ⚠️ 从简项：WebGPU/TSL（副本用 WebGL 即可验证思想，TSL 双后端在正式项目再上）；@pmndrs/uikit（副本 DOM 层在 canvas 外）；Lenis 页面吸附；四档设备分级（副本仅钳制 DPR）
- ❌ 未搬运：原站文案、图像、字体、模型资产——所有内容为本副本原创占位

## 排障实录（三个黑屏 bug，均已完成并验证）

1. **ShaderMaterial 缺 vertexShader**：Three.js 的 ShaderMaterial 必须显式提供 `vertexShader`，否则材质编译失败全屏黑。→ 已在 `mat()` 工厂内置默认顶点着色器。
2. **正交相机共面裁剪 ×2**：全屏合成面片先与 near=0 相机共面、修后又被 far=1 卡在远裁剪面上——两次都表现为纯黑且无任何报错。→ `OrthographicCamera(-1,1,1,-1,0.1,10)` + `position.z=5`，让平面落在视锥正中。
3. **GLSL uniform 未声明**：JS 侧 `uniforms` 有值不代表 GLSL 可用——fragment 里用了 `uRes` 却没写 `uniform vec2 uRes;`，报错只走 console。→ 已声明；并给副本加了 `renderer.debug.onShaderError` 页面错误面板，shader 编译错误从此直接亮在页面上。

诊断方法（复用）：错误面板（`showErr`，须挂 `window`，`const` 声明不进 window）+ `renderer.info` 每帧 draw call 数 + 截图三管齐下。

## 已知打磨项（后续迭代）

- INSIDE 段卡片构图与横幅曝光时机（相机 dolly 曲线调校）
- 穿幕闪断（黑幕 dip）的时机与节奏
- 移动端性能分级（目前仅钳制 DPR）

## 原站的"全局触点"（2026-09-16 高频连拍实测补记）

高频截图（~0.1s/张）浏览原站后确认的两个此前漏掉的体验层：

- **Loading 页**：不是转圈 spinner。CRT 终端风格——黑底 + 字符块进度条（`██████░░░░`）+ 品牌
  标识 + 扫描线质感，加载界面本身就是站点的第一屏"开机动画"，与主站后处理视觉统一。
  （已补齐：见上方"开机 loading 页"。）
- **404 彩蛋**（官方在 [X 上分享过](https://x.com/shadersweden/status/2091296425699086657)）：
  3D 金库门（舵轮 + 铰链 + 锁定螺栓 + 404 大字），**滚动开门**——页角拟物卷起/门缝扩展，
  门洞里露出的不是插画而是**真实首页 3D 场景**，继续滚动直接穿回首页。错误页被做成
  回家的彩蛋入口。（已按另一路数补齐：OpenAI 广告点彩风 `404.html`，见上。）

这两点的共同启示：**边缘状态也是叙事面**。loading 是第一印象、404 是"迷路时刻"——它们
与 memo 里的「彩蛋精神」直接对应，属于正式站必做项。

## 运行

```bash
cd study/shader-se-clone
python3 -m http.server 4173
# 打开 http://localhost:4173
```

（Three.js 与 Lenis 经 CDN 加载，需联网。）

## 学到什么、用在哪

这份副本验证的管线正是 iiiiiei.com「一期一会」架构的地基：**滚动驱动 + 场景链 + 穿屏过渡**直接对应主题 01 构想里的"次元墙"——相机推入 CRT 屏幕的瞬间就是换次元的瞬间。
