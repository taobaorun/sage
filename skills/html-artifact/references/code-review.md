# Code Review / PR writeup / 代码理解

## 何时用
- 用户做 code review，需要展示 diff + 标注
- 写 PR writeup 给同事看
- 解释一段不熟悉的代码 / 架构（"我看不懂这个 rate limiter"）
- 给 PR 附一份 explainer，比 GitHub 默认 diff 视图更易读

## 推荐参考示例
- `assets/examples/03-code-review-pr.html` — 完整 PR review 页面（PR header、严重等级配色、diff 渲染、按文件分组）
- `assets/examples/17-pr-writeup.html` — PR 作者侧的 writeup（动机、设计、风险）
- `assets/examples/04-code-understanding.html` — 解读已有代码（数据流 + 关键代码段）

## 关键模式

### 1. PR Review 结构
1. **PR header**：仓库 / 分支 / 作者 / 提交时间 + PR 号（mono 字体）
2. **TL;DR**：3 句话内说清这个 PR 干了什么、风险在哪
3. **按严重等级分组的 findings**：用 `--rust`（必须改）/ `--clay`（建议改）/ `--olive`（dna' / 表扬）色块
4. **Diff 渲染**：左右分栏 or 行内 +/-，红绿色用 `--rust` / `--olive`，关键行旁边用 `<aside>` 加注释
5. **gotchas / 知识点**：reviewer 在过程中学到的东西，未来人能复用

### 2. 代码解读结构
- 顶部一张 SVG 数据流图（最重要）
- 3-4 段关键代码，每段配 margin annotation
- "gotchas" 折叠区放反直觉的地方

### 3. Diff 渲染细节
- `<pre>` + `<code>`，`white-space: pre`
- 行号列：`color: var(--gray-500)`，`user-select: none`
- 增/删行：背景 `rgba(...)` 透明色，避免太刺眼
- 行内 highlight：`background: var(--oat)` 标重点片段
- 关键代码用 `<aside>` 在右侧或下方注释，**不要堆在文末**

### 4. 长 diff 的处理
- 折叠不重要的文件（`<details><summary>`）
- 顶部加文件树概览，点击跳锚点
- 每个文件标 +X / -X 行数

## Prompt 范例

> 帮我 review 这个 PR，做成 HTML artifact。我对 streaming/backpressure 不熟，重点讲那部分。渲染 diff 带行内标注，按严重等级配色。

> 我看不懂这个 rate limiter。读相关代码后做一个 HTML explainer：token bucket 流程图 + 3-4 段关键代码 + "gotchas" 区。给"读一遍就懂"的人看。

> 给这个 PR 写一份 writeup HTML：动机、设计选择、未走的方向、上线后要观察的指标。

## 常见坑
- **diff 全文照搬**：没人会看 200 行 diff，挑关键 5-15 个 hunk 标注就够
- **没区分 reviewer / 作者视角**：review 是"读者发现什么"，writeup 是"作者想让你看什么"
- **缺数据流图**：只贴代码不画图，等于把 GitHub 抄了一遍
