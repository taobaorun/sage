# html-artifact

> 把交付物（specs、计划、code review、设计原型、研究报告、自定义编辑器）做成**单文件 HTML artifact**，让 Claude 用富视觉、可交互的网页代替 Markdown 输出。

灵感来自 Thariq 的 [The Unreasonable Effectiveness of HTML](https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html)。本 skill 内置了作者公开的 [20 个高质量示例](https://thariqs.github.io/html-effectiveness/)（已离线下载在 `assets/examples/`）作为设计参考。

## 何时被激活

- 用户要 spec / 实施计划 / 多方案对比 / brainstorming
- 用户要报告 / 周报 / 故障复盘 / explainer
- 用户要 code review / PR writeup / 代码解读
- 用户要设计原型 / 组件变体 / 动画调参
- 用户要自定义编辑器（triage 看板、配置编辑、prompt tuner）
- 任何"给人反复看、要分享、要交互"的交付物

## Install

```bash
tnpm install -g @antskill/html-artifact
```

## 项目结构

```
html-artifact/
├── SKILL.md                    # 主 skill 定义（强触发指引 + 工作流）
├── references/                 # 场景特化指引（按需 Read）
│   ├── specs.md                # specs / 计划 / 多方案探索
│   ├── code-review.md          # code review / PR / 代码理解
│   ├── prototype.md            # 设计 / 原型 / 动画 / 组件
│   ├── report.md               # 报告 / 研究 / 复盘 / explainer
│   └── editor.md               # 自定义编辑器 / 调参 UI
├── assets/
│   └── examples/               # 20 个高质量示例（离线，可作模板）
│       ├── index.html          # 总览索引
│       ├── 01-exploration-code-approaches.html
│       ├── 02-exploration-visual-designs.html
│       ├── 03-code-review-pr.html
│       ├── ... (共 20 个)
│       └── 20-editor-prompt-tuner.html
├── package.json
├── install.js / uninstall.js   # 安装钩子
└── README.md
```

## 用法

安装后，当你在 Claude Code 里向 Claude 提出"做个 HTML 解释这个 PR"、"画一个流程图"、"做个三栏拖拽看板"等需求时，skill 会自动激活，引导 Claude：

1. 找到最贴近的示例（`assets/examples/<NN>-*.html`）
2. 复用 Anthropic 风格的设计 token（ivory + clay + olive + serif）
3. 单文件自包含输出
4. 自动 `open` 文件让你立刻看效果

## License

MIT
