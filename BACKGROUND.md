# iiiiiei.com 总背景

> 本文件是所有项目的运作总背景，随背景变化持续更新。
> 最后更新：2026-09-15

## 域名资产

| 域名 | 用途 | 状态 |
|---|---|---|
| iiiiiei.com | 个人 web（本工作区） | NS 已从 Spaceship 托管至 Cloudflare |
| （第二个域名，待告知名字） | GitHub 上的开源精神组织展示 web | 另行规划，不在本工作区范围内 |

- 注册商：Spaceship
- DNS 管理：Cloudflare（已修改 nameserver）
- 域名邮箱：**明确不需要**，不再规划

## 代码与部署链路

- 源代码托管：GitHub
- 本项目仓库：https://github.com/iiiiiei/pages01（已打通本地 ↔ 远端，凭证走钥匙串 @github 插件 token）
- **预览通道**：GitHub Pages（main 分支根目录，https://iiiiiei.github.io/pages01/）——根路径 = Phase 1 原型（用户在 GitHub 上迭代的 20+ 提交，ASCII 外部世界 + CSS 3D Macintosh），`studies.html` = 预览索引，`projects/theme-01/study/shader-se-clone/` = shader.se 管线学习副本
- **正式发布**：Cloudflare（待站点一期成型后接 Workers/Pages + 绑定 iiiiiei.com）
- 工作流：桌面工作区开发 → git push → GitHub Pages 自动更新预览
- 注意：GitHub Pages 缓存 10 分钟（cache-control: max-age=600），改版后验证线上效果需绕缓存（加查询参数）

## 平台决策记录（2026-09 核实）

Cloudflare 官方推荐新项目使用 **Workers + Static Assets**；Pages 未弃用但新功能投入已停止，dashboard 也在弱化，未来可能自动迁移至 Workers。

| 维度（免费计划） | Pages | Workers |
|---|---|---|
| 静态资源请求 | 无限免费 | 无限免费 |
| 动态请求 | 10 万次/天（Functions 即 Workers） | 10 万次/天 |
| 构建 | 500 次/月（按次数） | 3,000 分钟/月（按时长） |
| 绑定 iiiiiei.com | 支持 | 支持（Custom Domains，DNS 已在 CF，零配置） |

- 倾向：**Workers + Static Assets**（官方正路，未来 KV/D1/R2/AI 等扩展能力都在 Workers 生态）
- 最终选择：**待第一个项目的 web 形态确定后定夺**
- 带宽说明：免费计划不限带宽（2026-06 曾有"100GB 上限"传言，经核实为孤证不实；即便属实 Workers 也被豁免）

## 受众与合规

- 访客：全球，无需中国大陆 ICP 备案
- 托管于境外节点，不存在备案约束

## 安全

- 用户已自行完善安全设置，ZCode 无需经手

## 本工作区目录约定

```
iiiiiei.com/
├── BACKGROUND.md   # 本文件：总背景（跨项目、长期有效）
└── projects/       # 每个项目一个子文件夹
    └── <项目名>/    # 项目背景 + 源码，web 需要持续更新，历史项目保留
```

- 一个项目 = 一个子文件夹，新建项目时在此登记
- 项目子文件夹内应各自维护项目背景/进展说明

## 站点定位（2026-09-15 由三份备忘录确定）

- 精神内核：**我坚信生活是艺术的低语 / I firmly believe that life is art's whisper**
- 形态：社交媒体式随时更新的"心流"容器——哲学思想、生活灵感
- **一期一会机制（Shopify Editions 期刊制）**：每期主题+内容一体、互不相同（灵感驱动），历史期完整封存倒序归档 → 根路径=当前期，归档 index 另设
- **品质目标**：shopify editions / shader.se 级视觉效果，冲击 Awwwards；技术路线 shader 驱动（WebGL/Three.js 已定，框架待第一期内容形态明确后定）
- 当前阶段：**构想探讨期，未开工**
- 彩蛋精神：给喜欢的人藏小心思
- 明确不需要：域名邮箱、评论区方案中不含强社交功能（"访客留下些什么"形态待定）

## 项目登记

| 项目 | 文件夹 | 状态 |
|---|---|---|
| 主题 01 · CRT 次元墙（站点一期） | `projects/theme-01/` | 构想探讨中，原始备忘录已存档至 `memos/` |

## 待定事项

- [ ] 第一期主题定稿与内容形态（探讨中，见 theme-01/PROJECT.md）
- [ ] 站点框架（Astro + WebGL 层 vs R3F 全家桶）
- [ ] 归档 index 形式与 URL 方案
- [ ] 站点语言（座右铭中英双语，站点语言待定）
- [ ] 第二个域名的名字与启动时间
