# 自定义编辑器（Custom Editing Interfaces）

## 何时用
当用纯文本难以描述用户想做的事时 — 例如重排一组任务、编辑一份带约束的配置、调试 prompt — 让 Claude 临时做一个**单文件 HTML 编辑器**，在 UI 里操作完后导出回 prompt。

> 这是 HTML artifact 真正比 Markdown 强的地方：双向交互。

## 推荐参考示例
- `assets/examples/18-editor-triage-board.html` — 拖拽 triage 看板（Now / Next / Later / Cut）
- `assets/examples/19-editor-feature-flags.html` — feature flag 配置编辑器（含依赖关系警告）
- `assets/examples/20-editor-prompt-tuner.html` — prompt 调试器（左侧编辑、右侧三个示例实时渲染）

## 核心原则

### 1. 永远配 export 按钮
**这是最重要的一条**。任何编辑器最后必须有一个或多个：
- `Copy as JSON`
- `Copy as Markdown`
- `Copy as Prompt`（带一句 rationale per item）
- `Copy diff`（只导出改动）

按钮点击后用 `navigator.clipboard.writeText()` 写剪贴板，并显示 1 秒"已复制"反馈。**没有 export 就是失败的编辑器。**

### 2. 预填合理的初始状态
- Triage 看板：让 Claude 先用对当前 ticket 的理解做一次推测排序
- Flag 编辑器：从用户给的现有 config 起步
- Prompt tuner：从用户给的现有 prompt 起步
用户来调"差最后 20%"，不是从空白开始

### 3. 把约束做成 UI 反馈，不是文档
- Flag A 依赖 Flag B：当你关掉 B 时，A 自动变红 + 弹一行提示
- Prompt 变量未填：变量槽用红色边框
- 拖到 Cut 列：显示一个 confirm

### 4. 一个文件，一次性使用
- 不写"通用编辑器"框架
- 不抽样式 / 组件
- 内联 vanilla JS，DOM 操作 + localStorage（如果需要持久化）
- 用完即弃，下次新需求重新生成

## 几种典型形态

### 拖拽看板（triage）
- 列：Now / Next / Later / Cut（或自定义）
- 卡片：标题 + 简介 + tag
- 拖拽用原生 `draggable` API（不引第三方库）
- 列底部显示卡片数 + 累计预估
- export："Now: ... (rationale)" 这种结构化文本

### 配置编辑器
- 表单 + 分组（按域分区）
- 依赖关系：当 A 变化时校验 B/C，违反时高亮
- 字段类型：toggle / number / enum / json
- export "Copy diff"：只输出与初始值不同的 keys

### Prompt 调试器
- 左侧 `<textarea>`：可编辑 prompt，变量槽 `{{name}}` 高亮
- 右侧 2-3 个示例输入，实时渲染填充后的 prompt
- 字符数 / token 数计数器
- export "Copy prompt" + "Copy filled examples"

### 数据集标注 / 审核
- 列表：每行一个样本，左边复选框 / 三态选择器
- 顶部统计："已 approve 12 / reject 3 / 待定 5"
- export：导出 approved 子集

### 颜色 / 缓动 / cron 等"难用文字描述"的取值器
- 用专门的 picker（`<input type="color">`、贝塞尔曲线编辑器、cron 可视化）
- 实时显示当前值的字符串形式
- export：直接复制字符串

## Prompt 范例

> 我要重排这 30 个 Linear ticket。做个 HTML 拖拽看板（Now / Next / Later / Cut），用你对当前优先级的最佳猜测预排好，加 "Copy as markdown" 按钮导出最终排序与每桶一行 rationale。

> 这是我的 feature flag 配置（贴 JSON）。做个表单编辑器：按 area 分组，标依赖关系，关掉前置项时警告，加 "Copy diff" 按钮只导出改的字段。

> 我在调这个 system prompt（贴 prompt）。做个并排编辑器：左边可编辑 prompt 高亮变量槽，右边三个示例实时渲染。底部加 token 计数和 "Copy prompt"。

> 这是我们的 30 条评估数据。做个 HTML 标注 UI，每条三态（pass / fail / unsure），顶部统计，"Copy as JSON" 导出 pass 子集。

## 常见坑
- **没 export，做了等于没做**
- **复杂状态不持久化**：用户刷新页面后清空，做几下就放弃。用 `localStorage` 自动保存
- **拖拽手感差**：没有 `cursor: grabbing`、没有放下时的过渡、放错位置不能撤销
- **依赖关系只在文档里写**：用户不会读，必须做成 UI 上的红色提示
- **导出格式错**：导出后用户还要手工调整格式才能贴回 Claude，等于失败
