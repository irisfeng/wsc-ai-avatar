# WSC AI Avatar — 设计文档（MVP v0.1）

> 卡通数字人辩论训练 Web App，面向 **World Scholar's Cup**（WSC）Team Debate 赛制。
> 本地优先（MacBook Pro M4 Max 36G），开源 + 高性价比为先。

---

## 1. 需求分析

### 1.1 目标用户
- 12–18 岁中学生（WSC 主力人群），多为非英语母语
- 教练 / 队长（少量，用于备课与赛前模拟）

### 1.2 核心痛点
| 痛点 | 现有方案缺陷 | 数字人 AI 如何解决 |
|---|---|---|
| 找不到陪练对手 | 队友水平不齐、教练时间有限 | AI 24/7 扮演对方辩手 |
| 缺乏即时反馈 | 一周才有一次复盘 | AI 评委逐句反馈、评分维度细化 |
| 议题准备效率低 | 海量信息无从下手 | AI 助理给论点框架 + prep notes |
| 比赛紧张 | 现实压迫感无法模拟 | 卡通形象降低门槛，多轮压力训练 |

### 1.3 MVP 场景优先级（用户确认）
1. **AI 对手陪练** — 扮演对方辩手，自动立论 / 质询 / 反驳
2. **AI 评委复盘** — 录音或文字稿输入，按 WSC 维度评分 + 逐点反馈
3. **议题资料准备助理** — 给主题框架、论点、证据要点（prep notes）

### 1.4 WSC Team Debate 赛制参考（用于 prompt 工程）
- 3v3，每位辩手 ~4 分钟立论 / 反驳
- 顺序：Prop 1 → Opp 1 → Prop 2 → Opp 2 → Opp Reply → Prop Reply（reply 各 2 分钟）
- 评分维度（每位辩手 70 分制，团队 210 分）：
  - **Style（25 分）** — 表达、节奏、语言、姿态
  - **Content（25 分）** — 论据强度、相关性、证据
  - **Strategy（10 分）** — 反应、结构、判定关键点
  - **POI / 团队配合（10 分）** — Reply 速度、角色配合
- 议题模板：`This House Believes That…` / `This House Would…`

---

## 2. 技术选型（开源 + 高性价比）

| 模块 | 选型 | 成本 | 替代方案 |
|---|---|---|---|
| 前端框架 | Next.js 15 + React 19 + TS + Tailwind 4 | 0 | Vite + React |
| UI 组件 | shadcn/ui | 0 | Radix raw |
| 卡通数字人 | **Live2D Cubism 5 + pixi-live2d-display-lipsyncpatch + PixiJS 7** | 0（个人 / 小工作室免授权） | VRM (three-vrm) |
| 数字人模型 | Cubism 官方示例 Hiyori / Mao Pro | 0（非商业） | 自绘 / 委托画师 |
| LLM 主线 | **DeepSeek V3 chat API**（$0.27/M in、$1.1/M out） | 低 | 本地 Ollama Qwen2.5-14b（M4 Max 可跑） |
| LLM 兜底 | **Ollama + Qwen2.5-14b-instruct（M4 Max 本地）** | 0 | Llama3.1-8b |
| TTS | **Edge-TTS（微软免费端点）** via `msedge-tts` node lib | 0 | Kokoro / GPT-SoVITS |
| STT | **浏览器 Web Speech API**（Chrome 内置）+ 可选 `faster-whisper` 本地 | 0 | Deepgram API |
| 状态管理 | Zustand | 0 | Redux Toolkit |
| 部署 | 本地 dev → Vercel（前端） + 后端无状态 API | 0–低 | Cloudflare Pages |

**关键决策：**
- **数字人不依赖 GPU**：Live2D 走 WebGL，嘴型用音频 RMS（root mean square）驱动，规避 SadTalker/MuseTalk 的算力成本。
- **LLM 双轨**：开发时 DeepSeek API（便宜稳定），断网 / 数据隐私场景用本地 Ollama。
- **TTS 选 Edge-TTS**：免费、多语言（英文 WSC 必备）、流式、节点级 lib 成熟。

---

## 3. 系统架构

```
┌────────────────────── Browser (Next.js Client) ──────────────────────┐
│                                                                       │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ Live2D Stage │◀──▶│  Audio Pipeline  │    │  Debate UI       │   │
│  │ (PixiJS)     │    │  - WebAudio RMS  │    │  - Mode select   │   │
│  │ Mouth/Expr   │    │  - <audio>       │    │  - Motion editor │   │
│  └──────────────┘    └─────────▲────────┘    │  - Transcript    │   │
│         ▲                      │             │  - Scorecard     │   │
│         │ params               │ stream      └────────┬─────────┘   │
│         │                      │                      │             │
│         │              ┌───────┴────────┐    ┌────────▼─────────┐   │
│         │              │  STT (Browser  │    │  Chat Store      │   │
│         │              │  Web Speech)   │    │  (Zustand)       │   │
│         └──────────────┴────────────────┴────┴────────┬─────────┘   │
│                                                       │             │
└───────────────────────────────────────────────────────┼─────────────┘
                                                        │ fetch
                                ┌───────────────────────▼─────────────────────┐
                                │   Next.js API Routes (Edge / Node runtime)  │
                                │                                             │
                                │   /api/chat     → LLM (DeepSeek | Ollama)   │
                                │   /api/tts      → Edge-TTS stream (mp3)     │
                                │   /api/score    → Structured rubric JSON    │
                                │   /api/research → Prep notes generator       │
                                └─────────────────────────────────────────────┘
```

### 3.1 数据流（典型一回合）
1. 用户点击 mic → 浏览器 SpeechRecognition 转文字 → 写入 transcript
2. 用户按"发送" → POST `/api/chat`，携带模式 / 历史 / 议题
3. 后端调用 LLM，流式返回文字 + `<emotion>` 标签
4. 前端把整段回复 POST `/api/tts` → 拿到 mp3 流
5. 播放 audio，同步 Web Audio Analyser → RMS → Live2D `ParamMouthOpenY`
6. 解析 `<emotion>` → 切换 Live2D Expression（happy / thinking / surprised）
7. 一轮结束，UI 展示 AI 评分卡（来自 `/api/score`）

---

## 4. 关键 Prompt 设计

### 4.1 对手模式（system prompt 摘要）
```
You are an experienced World Scholar's Cup debater on the {OPPONENT_SIDE} side.
Motion: "{MOTION}"
Style: confident, structured, age-appropriate (high-school level).
Always: signpost (Firstly/Secondly), give 1 concrete example, link back to motion.
Length per turn: ≤ 120 words (≈ 45s spoken).
End every speech with one Point of Information offered to the user.
Output an inline emotion tag, e.g. <emotion>confident</emotion>.
```

### 4.2 评委模式
```
You are a WSC adjudicator. Score each speech on:
  Style /25, Content /25, Strategy /10
Return strict JSON:
  { "style":{score, comment}, "content":{...}, "strategy":{...}, "total":N, "actionable":[3 tips] }
Be specific, cite the speaker's exact phrases.
```

### 4.3 议题助理
```
You are a WSC prep coach. For motion "{MOTION}":
  - Define key terms (≤ 30 words each)
  - Top 3 Proposition args (claim → warrant → impact → example)
  - Top 3 Opposition args (same structure)
  - 5 likely rebuttals each side
  - 5 evidence anchors with rough source (real or "search: …")
Output Markdown.
```

---

## 5. MVP 范围与里程碑

| 里程碑 | 内容 | 验收标准 |
|---|---|---|
| **M0 脚手架** | Next.js 15 工程 + Tailwind + shadcn + 三页路由 | `npm run dev` 进首页 |
| **M1 Live2D 舞台** | Hiyori 模型加载、待机动作、鼠标跟随 | 浏览器看到角色眨眼 |
| **M2 文字对话核心** | 三模式 chat + DeepSeek API | 输入文字得到角色回复 |
| **M3 TTS + 嘴型** | Edge-TTS 流播 + 音频 RMS 驱动嘴型 | 角色"说话"嘴会动 |
| **M4 STT + 麦克风** | 浏览器 STT 输入 | 按麦说话能转文字并发送 |
| **M5 评分卡 + 议题助理** | 结构化 JSON 评分 + prep notes | 评委模式给出三维分数 |
| **M6 文档与可用** | README、env.example、CI 基础 | 第三人能 clone 跑通 |

**当前迭代实现 M0–M5。M6 文档同步落地。**

---

## 6. 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|---|---|---|---|
| Live2D 模型授权 | 中 | 低 | MVP 用官方示例（非商业），上线前替换为自有/委托 |
| Edge-TTS 端点不稳定 | 低 | 中 | 备 OpenAI-TTS / Kokoro 本地 fallback |
| 浏览器 STT 仅 Chrome 支持完整英文 | 中 | 中 | Hint 用 Chrome；可选 faster-whisper sidecar |
| DeepSeek 速率限制 | 低 | 中 | 本地 Ollama 兜底 |
| Live2D Cubism Core 是闭源二进制 | 已知 | 低 | 浏览器侧脚本免费可用，注意 TOS |

---

## 7. 目录结构

```
wsc_AIAvatar/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 首页（模式入口）
│   ├── debate/page.tsx             # 对手陪练
│   ├── judge/page.tsx              # 评委复盘
│   ├── prep/page.tsx               # 议题助理
│   └── api/
│       ├── chat/route.ts
│       ├── tts/route.ts
│       └── score/route.ts
├── components/
│   ├── live2d/
│   │   ├── Live2DStage.tsx
│   │   └── useLipSync.ts
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   └── Mic.tsx
│   └── ui/                         # shadcn
├── lib/
│   ├── llm.ts                      # provider 抽象
│   ├── prompts.ts                  # 三场景 system prompts
│   ├── tts.ts                      # msedge-tts 封装
│   └── rubric.ts                   # WSC 评分 schema
├── public/
│   └── live2d/                     # Cubism Core + 模型
├── DESIGN.md
├── README.md
└── package.json
```

---

## 8. 后续扩展（非 MVP）
- 真人风格 talking head（MuseTalk / LatentSync，需 GPU）
- 多语言 TTS 训练（Coqui XTTS 克隆教练声音）
- 多人模拟整场 3v3
- 录像回看 + 时序高亮
- 教练后台 + 班级数据
- 自有 Live2D 模型（IP 化）
