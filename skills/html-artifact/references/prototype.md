# 设计 / 原型 / 动画 / 组件

## 何时用
- 设计某个组件 / 流程，HTML 是表达力最强的"草稿纸"
- 调动画参数（duration、easing、delay）
- 试组件变体（按钮的 N 种状态、卡片的 N 种密度）
- 给设计系统画一张可视化总览

## 推荐参考示例
- `assets/examples/05-design-system.html` — 完整设计系统总览页
- `assets/examples/06-component-variants.html` — 单个组件的多种变体并排
- `assets/examples/07-prototype-animation.html` — 带 sliders 的动画调参原型
- `assets/examples/08-prototype-interaction.html` — 可点击的交互原型

## 关键模式

### 1. 动画调参 playground
- 主区放真实运行的动画 demo
- 侧栏放 `<input type="range">`，参数实时绑动画
- **必须**配 "Copy as CSS / Copy as JSON" 按钮，把当前参数导出
- 几个 preset 按钮（"snappy"、"smooth"、"playful"），让用户快速试组合

### 2. 组件变体对比
- CSS Grid 矩阵：列 = 状态（default/hover/active/disabled），行 = 变体（primary/secondary/...）
- 每个 cell 标注 token（`--clay-700`、`16px / 1.4`），让用户能直接抄
- 顶部加一行真实使用场景的 demo（不是孤立的组件，而是放在卡片/对话框里）

### 3. 设计系统总览
- 顶部大标题 + 一句话定位（这个系统的"价值观"）
- 色板：每个色块下面写 hex + token 名 + 用途
- 字阶：`<h1>` 到 `<small>` 全展示，每行标 size/weight/line-height
- 间距、圆角、阴影：用真实卡片样例展示，不要只贴数字

### 4. 交互原型
- 用最小 JS 实现一两个核心动作（点击切换、拖拽排序）
- 不写状态机框架，纯 vanilla JS 操作 DOM
- 关键交互旁边加一个 `<details>` 解释"这个动画 300ms 是因为..."

## Prompt 范例

> 我要设计一个新的 checkout 按钮：点击后播放动画再变紫色。做一个 HTML 原型，左边是真实按钮，右边给我若干 sliders（duration、easing、color）和"Copy as CSS"。

> 把我这个组件库做一份设计系统总览 HTML：色板、字阶、间距、四种核心组件的所有变体。不熟悉的设计师能从中拷代码上手。

> 我在试三种 hero 区设计方向：极简 / 信息密度高 / 视觉冲击力。做成一份 HTML 让我点击切换查看，每个下面写 tradeoff。

## 常见坑
- **JS 框架满天飞**：除非项目就用 React，否则原生即可，artifact 不是产品
- **slider 调了不知道意义**：每个 slider 旁边显示当前值（如 `300ms`）
- **没 export**：调到完美却没法把参数带回 prompt，等于白调
- **动画太花**：调参原型应该聚焦 1-2 个参数，不是把所有 CSS 都开成 slider
