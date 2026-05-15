# WSC AI Avatar — 卡通数字人辩论训练

> 面向 **World Scholar's Cup** Team Debate 的卡通数字人 web app：
> Live2D + 多家 LLM API + Edge-TTS。本地零 GPU 跑通，覆盖 **AI 对手陪练 / AI 评委复盘 / 议题准备助理** 三大场景。

---

## 一句话定位

**给 World Scholar's Cup 辩手用的、卡通数字人在线陪练 web app —— 一个人也能练满 4 分钟。**

---

## 解决谁的什么痛点

| 用户 | 现实痛点 | 本项目给出的解法 |
|---|---|---|
| **WSC 辩手（中学生）** | 队友水平不齐、找不到对手、教练时间稀缺 | 24/7 AI 数字人陪练，按真实赛制扮演对方辩手 |
| **WSC 辩手** | 没人复盘、错过细节、一周才反馈一次 | 粘文字稿 → AI 评委按 WSC 三维 rubric 即时打分 |
| **WSC 辩手** | 拿到新议题不知从何下手 | 输入 motion → 一键生成正反方论点 + 证据 + 反驳框架 |
| **教练 / 队长** | 集训前要批量准备议题资料 | 议题库自带 46 条真题，可一键生成完整 prep notes |

---

## 三大核心功能

### 1️⃣ AI 对手陪练（`/debate`）
- Live2D 卡通数字人 **Hiyori** 真人化对话：会说话、嘴动、切表情（confident / thoughtful / amused / firm）
- AI 严格按 WSC Team Debate 协议出招：**80–120 词 / Signpost / 一条 POI**
- 立场切换（Proposition / Opposition）+ 轮次切换（opening / rebuttal / reply）
- 麦克风一键说英文（Chrome 内置 STT）
- **流式输出**：首 token < 300ms 就开始进字，不再干等

### 2️⃣ AI 评委复盘（`/judge`）
粘贴一段发言稿，AI 按 **World Scholar's Cup 官方三维评分**给结果：

| 维度 | 满分 | 评什么 |
|---|---|---|
| **Style** | 25 | 表达、节奏、语言、姿态 |
| **Content** | 25 | 论据强度、相关性、证据 |
| **Strategy** | 10 | 反应、结构、判定关键点 |

外加：
- **Highlights** — 摘出说得最好的 2–4 句原话
- **Actionable** — 3 条具体改进建议（不是空话）
- **双模型支持** — 评委可单独走 `deepseek-v4-pro`（推理强），陪练用 `deepseek-v4-flash`（便宜）

### 3️⃣ 议题准备助理（`/prep`）
输入 motion，10 秒内拿到完整 Markdown prep sheet：
- Definitions（关键术语 ≤30 词）
- Proposition 三大论点（claim → warrant → impact → example）
- Opposition 三大论点（同结构）
- 双方各 3 条预判反驳
- 5 条证据锚点
- 一段 Strategy Note 写清楚双方该怎么 frame

---

## 议题库（真实赛事档案）

**46 条 WSC 真题**，覆盖三届：

| 年份 | 主题 | 数量 |
|---|---|---|
| **2026** | "Are We There Yet?" — 旅程 / 进步 / 终点 | 22 条 |
| **2025** | "Reigniting the Future" | 12 条 |
| **2024** | "Reimagining the Present" | 12 条 |

按 WSC 官方 **6 学科**标签分类（History 📜 / Social Studies 🌍 / Science 🔬 / Art & Music 🎨 / Literature 📚 / Special ⚡），UI 上 chip 一点即筛。

> 议题档案参考 [`irisfeng/wsc-scholar-ai`](https://github.com/irisfeng/wsc-scholar-ai)（Beijing Alpacas 历年存档）。

---

## 学生看不见但很关键的工程能力

| 能力 | 落地 |
|---|---|
| **多 LLM 任选** | DeepSeek V4 (flash/pro) · 阿里百炼 · 火山方舟 · SiliconFlow · OpenAI · Ollama 本地 —— 改一个环境变量切换 |
| **TTS 可插拔** | 默认 Edge-TTS（免费） · 留 VoxCPM / Kokoro / OpenAI TTS 接入口 |
| **本地零 GPU 跑通** | Mac M4 Max + Ollama qwen2.5:14b 全栈本地、断网可用 |
| **数据隐私** | 历史对话 100% 存浏览器 IndexedDB，不上传任何服务器 |
| **流式响应** | SSE 协议，token-by-token 进字 + Stop 按钮中断 |
| **类型与测试** | TS strict · **69 单元测试 100% 通过** · 核心 lib 100% 行覆盖 |
| **数字人扩展** | Live2D Cubism 4，换模型只改一个路径就能换 IP |

---

## 🧱 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Next.js 15 App Router + React 19 + Tailwind |
| 数字人 | pixi-live2d-display-lipsyncpatch + PixiJS 7 + Cubism 4 Core |
| 语音 | Edge-TTS (msedge-tts) 出语音；Web Speech API 做 STT |
| LLM | OpenAI 兼容协议 — DeepSeek / DashScope / Volcengine / SiliconFlow / OpenAI / Ollama |
| 存储 | 浏览器 IndexedDB（via idb），数据不出本机 |
| 测试 | Vitest + fake-indexeddb，单元 + 契约 + 存储集成 |

---

## 🚀 本地启动（macOS / M4 Max 实测）

### 1. 依赖
```bash
npm install
```

### 2. 配置 LLM
```bash
cp .env.example .env.local
```
按需填入任意一家的 `*_API_KEY`，把 `LLM_PROVIDER` 切到对应 provider：

| 值 | 说明 | 默认 model |
|---|---|---|
| `deepseek` | DeepSeek 官网 API (V4) | deepseek-v4-flash（陪练/prep）· deepseek-v4-pro（评委） |
| `dashscope` | 阿里云百炼（OpenAI 兼容模式） | qwen-plus |
| `volcengine` | 火山方舟，model 填 endpoint id `ep-xxx` | （需自填） |
| `siliconflow` | SiliconFlow | Qwen/Qwen2.5-32B-Instruct |
| `openai` | OpenAI 或任意兼容端点 | gpt-4o-mini |
| `ollama` | 本地 Ollama，需先 `ollama pull qwen2.5:14b` | qwen2.5:14b |

### 3. 下载 Live2D 模型与 Cubism Core
```bash
npm run setup:live2d
```
脚本会从 Live2D 官方 CDN 抓 Cubism 4 Core 运行时，并从官方示例仓库下载 Hiyori 模型到
`public/live2d/`。**Hiyori 是 Live2D Inc. 示例模型，仅供非商业演示**；上线请替换为自有/授权模型。

### 4. 启动开发服务器
```bash
npm run dev
```
打开 `http://localhost:3000`。建议使用 **Chrome** 以获得最佳 STT 体验。

### 5. 自检与测试
```bash
npm test          # 单元测试（69 个，~250ms）
npm run typecheck # tsc --noEmit
npm run smoke     # 拉起 dev server 真打三条 API
```

---

## 🗂 目录结构

```
app/
  page.tsx                       # 模式入口
  debate/page.tsx                # 对手陪练（Live2D + 语音 + 流式）
  judge/page.tsx                 # 评委复盘 + 历史
  prep/page.tsx                  # 议题助理
  api/
    chat/route.ts                # LLM 代理（SSE 流式 + 非流式双轨）
    score/route.ts               # 评委 JSON 评分
    tts/route.ts                 # Edge-TTS / OpenAI 兼容 TTS
components/
  live2d/                        # 数字人舞台 + 唇形 hook
  chat/
    ChatMessages.tsx             # 消息列表 + 流式气泡
    MotionPicker.tsx             # 学科 / 年份 chip 筛选 + Random
    HistoryPanel.tsx             # IndexedDB 历史列表
    streamClient.ts              # 浏览器侧 SSE 消费器
    useMic.ts / ttsClient.ts     # STT / TTS 客户端封装
lib/
  llm.ts                         # 多家 OpenAI 兼容客户端 + 流式 + 评委模型 fallback
  prompts.ts                     # 三场景 system prompts
  motions.ts                     # 46 条 WSC 真题（2024/2025/2026）
  storage.ts                     # IndexedDB sessions (debate + judge)
  rubric.ts                      # WSC 评分 schema + clamp
  parseEmotion.ts                # 解析 <emotion> 与 POI:
  tts.ts                         # TTS provider 抽象
tests/                           # Vitest — 69 tests, 8 suites
public/live2d/                   # Cubism core + Hiyori 模型
scripts/
  setup-live2d.sh                # 抓 Cubism Core + Hiyori
  smoke.sh                       # 三条 API 端到端冒烟
DESIGN.md                        # 完整需求与方案设计
```

---

## 🛣 后续路线（非 MVP）

- ✅ ~~单元测试~~ · ✅ ~~SSE 流式~~ · ✅ ~~真实议题库~~ · ✅ ~~历史存档~~
- TTS 流式按句喂（开口延迟再砍 1s）
- L4 评测脚本：固定 20 motion 跑基线，给 prompt 迭代量化抓手
- VoxCPM 接入：固定卡通形象专属音色 + 情绪
- 多人 3v3 整场模拟（多 agent 编排）
- 录像回看 + 时序高亮 + 维度趋势
- 教练后台 + 班级数据看板

---

## ⚖️ 许可与商标

- 本仓库代码 **MIT**。
- **Live2D® Cubism®** 商标与 Cubism Core 运行时归 Live2D Inc. 所有；Hiyori 等示例模型仅限非商业演示。商业落地前请获取授权或采用自有模型。
- DeepSeek / 阿里 / 火山 / SiliconFlow / OpenAI API key 计费由各厂商决定。

---

## 一句话最终总结

**把 ChatGPT、Edge-TTS、Live2D、真实 WSC 议题档案缝成一个"卡通辩手陪练机"，让一名 WSC 辩手在卧室里也能完成对手陪练 + 复盘 + 备赛三件事，本地零成本起步，可云端规模化。**

参见 [DESIGN.md](./DESIGN.md) 了解完整设计推导与里程碑。
