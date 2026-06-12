# 示例索引（来自 thariqs.github.io/html-effectiveness）

20 个高质量 HTML artifact 示例，按场景分组。每个文件都是单文件自包含的，可直接 `open` 查看，也可直接复用结构、配色、组件。

## 探索 / 多方案对比

- `01-exploration-code-approaches.html` — 同一问题的 N 种代码实现并排
- `02-exploration-visual-designs.html` — 视觉方向并排对比

## Code Review / PR

- `03-code-review-pr.html` — 完整 PR review 页（PR header / 严重度配色 / diff / 文件分组）
- `04-code-understanding.html` — 解读已有代码（数据流图 + 关键代码段）
- `17-pr-writeup.html` — PR 作者侧 writeup（动机 / 设计 / 风险）

## 设计 / 原型 / 组件

- `05-design-system.html` — 设计系统总览（色板 / 字阶 / 组件）
- `06-component-variants.html` — 单组件多变体矩阵
- `07-prototype-animation.html` — 动画 sliders 调参原型
- `08-prototype-interaction.html` — 可点击交互原型

## 报告 / 研究 / 复盘

- `09-slide-deck.html` — slide-deck 风（一屏一观点）
- `10-svg-illustrations.html` — SVG 技术插图集
- `11-status-report.html` — 周报 / 状态汇报
- `12-incident-report.html` — 故障复盘
- `13-flowchart-diagram.html` — 流程图主导的 explainer
- `14-research-feature-explainer.html` — 单 feature 深度解读
- `15-research-concept-explainer.html` — 单概念深度解读

## 实施计划

- `16-implementation-plan.html` — 完整实施计划（数据流 / 代码 / 风险 / 验收）

## 自定义编辑器

- `18-editor-triage-board.html` — 拖拽 triage 看板
- `19-editor-feature-flags.html` — feature flag 配置编辑器（含依赖警告）
- `20-editor-prompt-tuner.html` — prompt 调试器（左编辑右实时预览 + token 计数）

## 共同的设计语言

所有示例都来自 Anthropic，共享一套设计 token（详见 SKILL.md "Step 2: 套设计系统"）：

- 主背景 `#FAF9F5`（ivory），卡片 `#FFFFFF`
- 强调色 `#D97757`（clay）/ `#788C5D`（olive）/ `#B04A3F`（rust）
- 边框 `1.5px solid #D1CFC5`，圆角 `12px`
- 字体：`ui-serif` 标题、system `--sans` 正文、`ui-monospace` 技术内容
- 容器 max-width 920–1120px

> 复用这套设计语言能让你的 artifact 看起来专业且统一。需要换风格时，至少保持"高信息密度、克制、serif 标题、不依赖外部 CDN"的精神。
