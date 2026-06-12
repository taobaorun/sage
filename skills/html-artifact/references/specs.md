# Specs / 计划 / 探索

## 何时用
用户在"想清楚做什么"阶段：brainstorming、对比方案、写实施计划、探索代码改动。一份 HTML artifact 能在新 session 里直接当上下文喂给 Claude，比一堆 Markdown 文件更高效。

## 推荐参考示例
- `assets/examples/01-exploration-code-approaches.html` — 同一问题的 N 种代码实现并排对比
- `assets/examples/02-exploration-visual-designs.html` — 视觉方向并排对比
- `assets/examples/16-implementation-plan.html` — 完整实施计划（带数据流、代码片段、风险点）

## 关键模式

### 1. 多方案并排对比
- CSS Grid，3-6 列，等宽
- 每张卡片包含：定位标题（"激进 / 保守 / 对话风"）→ mini mockup → tradeoff 列表 → 适用场景标签
- 用 `--clay`（推荐）/ `--olive`（稳）/ `--rust`（不建议）做语义标记
- 顶部一行总览：当前对比的几个维度（如"layout / 信息密度 / 语气"）

### 2. 实施计划（长文档型）
顶部 sticky 锚点导航：背景 / 设计 / 数据流 / 实施 / 风险 / 验收。每节里：
- 数据流用 inline SVG（参考 `13-flowchart-diagram.html`、`10-svg-illustrations.html`）
- 关键代码段用 `<pre><code>`，旁边用 `<aside>` 做 margin annotation
- 依赖关系画箭头连线（SVG path）
- 验收清单用 `<input type="checkbox" disabled>` + 状态色

### 3. Mockup 的取舍
- 真要展示交互逻辑：做能点击的 mini demo（按钮 hover、tab 切换）
- 只是在比布局：纯 div + CSS，不要画"看起来像设计稿但其实没用"的伪 mockup
- 截图风格的占位用 SVG 画线框，不要外链图片

## Prompt 范例

> 我在想 onboarding 应该怎么做。给我 6 个明显不同的方向 — layout / 语气 / 信息密度都拉开差距 — 做成一个 HTML 文件用 grid 并排。每个标注 tradeoff。

> 写一份完整实施计划成 HTML：背景、数据流图（SVG）、关键代码片段（带行内标注）、风险点、验收清单。给同事评审用。

> 这个 PR 我有三种实现思路，做个对比 HTML：每种的代码骨架、性能假设、风险点、未来扩展性。

## 常见坑
- **方案数太多**：超过 6 个时很难一屏比较，考虑分组或换成"主推方案 + 备选列表"形式
- **每张卡片太长**：卡片内信息过多就失去并排价值，把详细内容折进 `<details>`
- **缺 tradeoff**：只列特性不列代价，等于没在做对比
