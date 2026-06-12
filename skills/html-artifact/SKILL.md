---
name: html-artifact
description: 把交付物做成单文件 HTML artifact 的专业技能——不是裸写 HTML，而是加载设计系统、复用高质量示例来输出专业级可视化页面。**即使 Claude 自认为会写 HTML，也必须先激活此 skill**：它提供了完整的 CSS 设计 token（Anthropic 风格配色/排版）、20 个场景参考示例、以及 export 交互规范——没有这些，产出的 HTML 会缺少统一视觉风格和可交互能力。触发场景包括：spec / 实施计划 / ExecPlan HTML 版本 / Tier 3 文档（design-docs、product-specs）/ 完成报告 / 批准基线 / 多方案对比 / 报告 / 周报 / 故障复盘 / code review / PR writeup / 系统图 / 流程图 / 架构图 / SVG / 原型 / demo / triage 看板 / 配置编辑器 / prompt 调试器 / explainer / 研究分享。即便用户说"写个 Markdown"，只要交付物是给人看的、需要反复阅读或分享的，也优先建议改用 HTML。
allowed-tools: Read, Write, Bash
---

# html-artifact

**核心理念**: HTML 比 Markdown 更适合表达"给人反复看、要分享、要交互"的交付物。能用一张可视化的网页讲清的事，就不要写一份 Markdown。

这个 skill 的作用不是给你套一堆模板，而是**让你优先想到 HTML**，并直接复用 [thariqs.github.io/html-effectiveness](https://thariqs.github.io/html-effectiveness/) 里 20 个高质量示例的设计语言与结构 — 它们已经下载在 `assets/examples/` 里，是你最重要的参考。

## 何时激活（强触发）

只要任务的**最终交付物**是一份"给人看的文档/演示/解释/编辑器"，**默认输出 HTML**，包括但不限于：

- spec / 实施计划 / brainstorming / 多方案对比 / 探索
- 报告 / 研究 / 周报 / 故障复盘 / explainer
- code review / PR writeup / 代码解读 / 系统图
- 设计原型 / 组件变体 / 动画调参 / 配色调整
- 自定义编辑器（triage 看板、配置编辑、prompt tuner）
- 任何需要 SVG 流程图 / 架构图 / 时序图的解释

**保留 Markdown 的少数情况**：
- 用户明确点名 Markdown
- 文件被另一个程序消费（README、commit message、CI input）
- 输出会渲染在 Slack / GitHub issue / 邮件正文里（不是附件/链接）

不确定时默认 HTML，结尾问一句"要不要换成 Markdown？"

## 工作流

### Step 1: 选定场景，找参考
对照下表，从 `assets/examples/` 里挑 1-2 个最贴近的示例 **`Read`** 一遍，复用它的结构与配色。

| 场景 | 示例文件 |
|------|---------|
| 多方案探索（代码） | `01-exploration-code-approaches.html` |
| 多方案探索（视觉） | `02-exploration-visual-designs.html` |
| Code Review / PR 评审 | `03-code-review-pr.html`, `17-pr-writeup.html` |
| 代码理解 / 概念解读 | `04-code-understanding.html`, `15-research-concept-explainer.html` |
| 设计系统 / 组件变体 | `05-design-system.html`, `06-component-variants.html` |
| 动画 / 交互原型 | `07-prototype-animation.html`, `08-prototype-interaction.html` |
| 幻灯片 / 演示 | `09-slide-deck.html` |
| SVG 图 / 流程图 | `10-svg-illustrations.html`, `13-flowchart-diagram.html` |
| 状态周报 | `11-status-report.html` |
| 故障复盘 | `12-incident-report.html` |
| Feature explainer | `14-research-feature-explainer.html` |
| 实施计划 | `16-implementation-plan.html` |
| 任务三角看板 / 编辑器 | `18-editor-triage-board.html` |
| 配置编辑器 | `19-editor-feature-flags.html` |
| Prompt 调试器 | `20-editor-prompt-tuner.html` |

不确定挑哪个，先 `Read assets/examples/index.html` — 它是这 20 个示例的索引页，浏览过去能找到相似形态。

每类场景的具体写法、prompt 范例、常见坑，写在 `references/<scene>.md`：
- [`references/specs.md`](references/specs.md) — specs / 计划 / 多方案探索
- [`references/code-review.md`](references/code-review.md) — code review / PR 解读 / 代码理解
- [`references/prototype.md`](references/prototype.md) — 设计 / 原型 / 动画 / 组件
- [`references/report.md`](references/report.md) — 报告 / 研究 / 复盘 / explainer
- [`references/editor.md`](references/editor.md) — 自定义编辑器 / triage / 调参 UI

### Step 2: 套设计系统
**强烈建议复用作者示例里的设计 token**（Anthropic 出品，质量高、风格统一）：

```css
:root {
  --ivory: #FAF9F5;       /* 主背景 */
  --paper: #FFFFFF;       /* 卡片背景 */
  --slate: #141413;       /* 标题 */
  --clay: #D97757;        /* 主强调（橙） */
  --oat: #E3DACC;         /* 边框、柔和强调 */
  --olive: #788C5D;       /* 次强调（绿） */
  --rust: #B04A3F;        /* 警告 / 删除 */
  --gray-150: #F0EEE6;
  --gray-300: #D1CFC5;
  --gray-500: #87867F;
  --gray-700: #3D3D3A;
  --serif: ui-serif, Georgia, "Times New Roman", serif;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Monaco, monospace;
}
```

排版规律：
- 标题 `--serif`、正文 `--sans`、技术内容（路径、tag、PR 号）`--mono`
- 容器最大宽 920–1120px，水平居中，左右 24–32px padding
- 卡片：`1.5px solid var(--gray-300)` + `border-radius: 12px` + `--paper` 背景
- 大量留白，`line-height: 1.55–1.6`，正文 15–16.5px

如果项目本身有设计系统（用户提供 brand/design tokens），优先用项目的，但保持相同的"信息密度高、克制、serif 标题"的精神。

### Step 3: 写内容
- **单文件自包含**：CSS/JS 内联，图片 base64 或 https URL，**禁止**外链 CDN（用户离线也得能看）
- **图优先于字**：能用 SVG 表达的关系，不要写一段散文描述
- **可交互的部分必须配 export 按钮** —— "Copy as JSON" / "Copy as prompt" / "Copy as markdown"，让用户能把 UI 操作结果回灌给 Claude（这是 artifact 真正比 Markdown 强的地方）
- **不要 ASCII 图**（`─┐│┘`），用 SVG
- **不要 emoji 装饰**（除非用户要求），用配色 + 排版区分语义

### Step 4: 打开看效果
生成后立刻用系统命令打开，让用户马上看到：

```bash
# macOS
open "<absolute-path>/output.html"

# Linux
xdg-open "<absolute-path>/output.html"

# Windows (PowerShell)
start "<absolute-path>/output.html"
```

如果在远程容器 / 无显示环境，跳过 `open`，告诉用户路径让他自己下载。

### Step 5: 闭环
- **不要把 HTML 内容粘到聊天里**，只报路径 + 一句话总结
- 主动问一句"要调哪里？" — 别等用户找问题
- 如果是"反复迭代调参型"的 artifact（编辑器、调试器），提醒用户用页面里的 export 按钮把状态拷回来

## 反模式（不要做）

- ❌ **不要把每个回答都套 HTML**。简单整理、一次性回答、Slack 风格的快速答复，用文本/Markdown。判断：用户会"反复看"或"分享给别人"吗？是 → HTML；否 → 别。
- ❌ **不要写 README 风的全文档**：HTML artifact 不是 docs site，不放作者、版本、license 这种页脚。
- ❌ **不要外链 CDN 关键资源**（Tailwind / React 之类）：除非用户允许，否则原生 CSS。
- ❌ **不要写"假装能交互但其实点了没反应"的按钮**。要么真做 export，要么纯展示。
- ❌ **不要在最终交付里留 `<!-- TODO -->` 注释**。
- ❌ **不要 ASCII 图**（用 SVG）；**不要 emoji 装饰**（用色块/字重/字号）。
- ❌ **不要凭空发明色彩**：直接复用上面的 CSS 变量；要扩展时遵循同色调。

## Examples

### Example 1: 多方案探索
**User**: "我在做 onboarding 屏，给我 6 个完全不同的方向，让我并排比较"

**Skill**:
1. `Read assets/examples/02-exploration-visual-designs.html` 拿 grid 结构
2. 复用 ivory + clay 配色与 serif 标题
3. 6 列 CSS Grid，每个方案一张卡：mini mockup（SVG/div）+ 一句话定位 + tradeoff 标签
4. 顶部 sticky 锚点导航
5. `open` 文件路径

### Example 2: PR Explainer
**User**: "帮我做一个 HTML 解释这个 PR，重点讲 streaming 部分"

**Skill**:
1. `Read assets/examples/03-code-review-pr.html` 与 `17-pr-writeup.html`
2. 套结构：PR 头（仓库/分支/提交者）→ 摘要 → diff 渲染 → 关键块标注 → "gotchas"
3. streaming 部分用 SVG 画时序图
4. 严重程度用 `--clay`（注意）/ `--olive`（OK）/ `--rust`（问题）色块标
5. `open`

### Example 3: 自定义编辑器
**User**: "我要重排这 30 个 Linear ticket，做个拖拽看板"

**Skill**:
1. `Read assets/examples/18-editor-triage-board.html`
2. 复用三栏拖拽布局（Now/Next/Later/Cut）
3. 预填 Claude 推测的初始排序
4. 顶部加 "Copy as markdown" 按钮，导出排序结果与每桶一行 rationale
5. `open`

### Example 4: 拒绝过度
**User**: "把这段日志的几个错误行整理一下"

**Skill**: → 这是简单整理任务，**用文本/Markdown 直接答**。判断：用户会反复看或分享吗？这种一次性快查不需要 artifact。

## 给 skill 使用者的提醒

作者 Thariq 在原文里说："I'm a little bit afraid that people will read this article and turn it into a /html skill or something." —— 这个 skill 的存在不是为了"必须套 HTML"，而是**纠正 Markdown 默认偏置**。当你判断这次交付确实更适合 HTML 时，这个 skill 帮你做得专业；当你判断 Markdown 更合适时，相信自己的判断，跳过这个 skill。
