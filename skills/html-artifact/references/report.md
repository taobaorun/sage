# 报告 / 研究 / 复盘 / explainer

## 何时用
- 周报、月报、状态汇报给老板
- 故障复盘 / 事故报告
- Feature 解读 / 概念解释 / 学习材料
- 综合多源信息（代码 / git / Slack / 文档）的研究报告
- 一份给 leadership 的"读一遍就懂"的页面

## 推荐参考示例
- `assets/examples/09-slide-deck.html` — slide-deck 风（横向页 / 大字 / 一页一观点）
- `assets/examples/10-svg-illustrations.html` — SVG 技术插图集
- `assets/examples/11-status-report.html` — 周报 / 状态汇报
- `assets/examples/12-incident-report.html` — 故障复盘
- `assets/examples/13-flowchart-diagram.html` — 流程图主导的 explainer
- `assets/examples/14-research-feature-explainer.html` — 单 feature 深度解读
- `assets/examples/15-research-concept-explainer.html` — 单概念深度解读

## 关键模式

### 1. 周报 / 状态汇报
- 顶部数字仪表盘：这周的 3-5 个关键数字（`--mono` 字体大显示，下面一句话说明）
- 三段：本周完成 / 进行中 / 风险点
- 每段用卡片列表，左边色块标状态（`--olive` / `--clay` / `--rust`）
- 底部"下周计划"，简洁一段

### 2. 故障复盘
固定结构（按惯例排）：
1. **TL;DR**：1 句话 + 影响时长 + 影响范围
2. **时间线**：横向 SVG 时间轴或纵向列表，关键事件高亮
3. **根因**：流程图展示故障传导路径
4. **修复**：做了什么 + 为什么这样做
5. **Action items**：表格 + 责任人 + DDL，未来怎么避免

### 3. Feature / 概念 explainer
- 顶部一张定义图（SVG），1 分钟读懂"这是什么"
- 中段：3-5 个核心机制，每个一段文字 + 一张图
- 底部：常见误解 / FAQ（折叠区）
- 全文最多 8 屏，给"地铁上读完"的人看

### 4. Slide-deck 风
- 一屏 = 一页 = 一个观点
- 大字（48px+）+ 一张支持图 + 一句注脚
- 顶部进度条 / 页码
- 翻页用滚动 snap 或 keyboard arrow

### 5. SVG 插图
- 流程图 / 时序图 / 架构图：参考 `10-svg-illustrations.html`、`13-flowchart-diagram.html`
- 优先 viewBox 自适应，不写死 width/height
- 节点用 `<rect>` + `<text>`，连线用 `<path>` 加箭头 marker
- 配色用 `--clay` / `--olive` 等系统色，不要花花绿绿

## Prompt 范例

> 我不懂我们的 rate limiter 怎么工作。读相关代码后做一份 HTML explainer：token-bucket 流程图、3-4 段关键代码标注、底部一段 gotchas。给"读一遍"的人看。

> 这周状态汇报做成 HTML：3 个核心数字、本周完成项、下周风险。给老板看，要一屏内能扫完。

> 上周的故障做一份复盘 HTML：时间线、根因传导图、action items 表格。我会把链接贴到 leadership 的 doc 里。

> 我们刚改完 prompt caching。结合 git history，做一份完整的研究 HTML：变化前后对比、命中率示意图、迁移指南。我自己读懂顺便分享给团队。

## 常见坑
- **数字没上下文**：`12345 requests/sec` 没有"vs 上周"或"目标 10000"是无意义的
- **时间线没刻度**：故障复盘的时间线必须标真实时间戳
- **SVG 配色乱**：用全局变量，不要每张图重新调色
- **写成长文档**：报告不是论文，能用图就别写段落
