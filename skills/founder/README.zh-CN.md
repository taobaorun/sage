# founder

> 一份面向 AI-Native 创业者的工作手册，覆盖创业四阶段：Idea / MVP / Launch / Scale。

**Other languages**: [English](./README.md)

## 这个 Skill 做什么

面向创业者（founder）的指导型 skill：

- 识别用户当前处于创业生命周期的哪个阶段
- 给出阶段特定的退出条件、典型陷阱、可执行练习
- 把每项工作映射到合适的 AI 形态（ChatBox / Cowork / Code Agent）
- 在用户过早 launch / scale / 跳阶段时直接给出 pushback
- 守住边界 —— 融资 / 法律 / 税务问题主动拒答并转介专家

内容改编自 Anthropic 的 *The Founder's Playbook: Building an AI-Native Startup*（2026），泛化处理后不绑定任何单一 AI 厂商。

## 触发场景

以下话题应当触发本 skill：

- AI-Native 创业策略
- 创业者如何用 AI 工具进行 orchestration
- 创业阶段退出条件 / 阶段过渡判断
- Agentic 技术债、过早 scaling、伪 PMF 信号
- 如何为某项任务选合适的 AI 形态（聊天 vs 协作工作区 vs agent 编码）
- 构建防御性护城河（数据飞轮、工作流锁定、领域深度）

也适用于帮助早期创业者搭建 AI-First 公司的运营 / 顾问角色。

## 安装

Claude Code 会从 `~/.claude/skills/<skill-name>/` 加载 skill，安装即把本目录放到那里。

**方式 A —— 直接拷贝：**

```bash
mkdir -p ~/.claude/skills/founder
cp SKILL.md ~/.claude/skills/founder/
cp -r references ~/.claude/skills/founder/
```

**方式 B —— 符号链接（推荐用于开发迭代）：**

```bash
ln -s "$(pwd)" ~/.claude/skills/founder
```

**方式 C —— 直接 clone 到 skills 目录：**

```bash
git clone <repo-url> ~/.claude/skills/founder
```

安装完成后重启 Claude Code（或开一个新会话），skill 会被自动识别，在 `/skills` 列表里可见。

## 卸载

```bash
rm -rf ~/.claude/skills/founder
```

## 文件结构

```
founder
├── SKILL.md                  # 主入口：阶段识别 + AI 矩阵 + 跨阶段原则
└── references/
    ├── idea-stage.md         # 问题验证、客户发现、轻原型
    ├── mvp-stage.md          # 架构、范围、安全、PMF 检测
    ├── launch-stage.md       # 技术债清理、运营系统、安全合规、PM 流程
    └── scale-stage.md        # 交付运营层、企业级基建、GTM、护城河
```

## 工作原理

Claude Code 的 skill 采用**渐进式加载**（progressive disclosure），只把需要的内容放进上下文：

1. **始终加载**（~100 词）：`SKILL.md` frontmatter 里的 `name` 和 `description`。Claude 据此判断是否触发本 skill。
2. **触发时加载**：`SKILL.md` 全文 —— 主路由器。包含阶段识别逻辑、AI 形态矩阵、跨阶段原则。
3. **按需加载**：`references/` 下的单个文件 —— 只读跟当前问题相关的那个阶段。

创业者提问后的运行流程：

```
创业者提问
   │
   ▼
[Description 匹配？→ Claude 调用本 skill]
   │
   ▼
读 SKILL.md
   │
   ▼
阶段识别 ─────────▶ 问题超出范围？
   │                      │
   ▼                      ▼
读 references/<stage>.md   转介合适的专家
   │                       （律师 / 领投合伙人 / 运营者）
   ▼
综合输出：
  • 阶段特定建议
  • 跨阶段原则（先验证、用 AI 唱反调……）
  • AI 形态推荐（ChatBox / Cowork / Code Agent）
   │
   ▼
直接回答创业者
```

两个关键设计：

- **阶段是 gate，不是标签**。skill 用每个阶段的*退出条件*判断 founder 实际处于哪个阶段，而不是看 founder 自己怎么描述。一个把抛光后的 prototype 发给朋友看、但没有真实潜在用户证据的 founder，仍然在 Idea 阶段 —— 跟产品成品度无关。
- **边界硬执行**。问题超出 skill 域（融资机制、地区性法律 / 税务、HR）时，skill 主动拒答并指向合适的专家，而不是在高风险专业问题上幻觉具体建议。

## 四个阶段速览

| 阶段 | 核心问题 | 退出条件 |
|---|---|---|
| **Idea** | 这事值不值得做？ | Problem-Solution Fit（真问题、真用户、真证据） |
| **MVP** | 第一步该建什么？ | 真实 PMF —— 用户复用、付费、推荐 |
| **Launch** | 能否可重复地增长？ | 可重复的 channel 驱动增长 + production-ready 基建 + 运营脱离创始人瓶颈 |
| **Scale** | 这事能自持续吗？ | 阈值事件 —— 盈利 / IPO / 被收购，且创始人不再亲力日常运营 |

## AI 形态矩阵（泛化版）

| 形态 | 用于 | 为什么 |
|---|---|---|
| **ChatBox** | 快速提问、头脑风暴、唱反调 | 对话式、零配置 |
| **Cowork** | 研究、文档撰写、循环运营 | 文件夹访问、MCP 连接器、定时运行 |
| **Code Agent** | 写、测、调、发布代码 | 代码库访问、计划模式、git 集成 |

底层模型相同，差异在工作区。

## 不在范围内

本 skill 明确**不**覆盖：

- 融资机制（条款书、股权结构、估值谈判）
- 招聘 / HR 细节
- 司法管辖区相关的法律或税务建议
- 行业相关的合规要求

遇到这类问题时，skill 会主动转介到合格专家（创业律师、领投合伙人、有经验的运营者等），而不是凭空给出可能误导的具体建议。

## 协议

MIT
