# WSC AI Avatar — 卡通数字人辩论训练 MVP

> 面向 **World Scholar's Cup** Team Debate 的卡通数字人 web app：
> Live2D + 多家 LLM API + Edge-TTS。本地零 GPU 跑通，覆盖 **AI 对手陪练 / AI 评委复盘 / 议题准备助理** 三大场景。

## ✨ 核心特性
- **Live2D 卡通形象**（Cubism 4，PixiJS 渲染）— 浏览器原生，无 GPU 依赖
- **唇形同步**：服务端 Edge-TTS 出 mp3 → Web Audio 实时 RMS → Live2D `ParamMouthOpenY`
- **三场景一体化**：
  1. AI 对手陪练（系统 prompt 内置 WSC 4 分钟立论 + POI 规则）
  2. AI 评委复盘（Style /25 + Content /25 + Strategy /10 三维评分）
  3. 议题准备助理（论点框架、定义、证据锚点、可能反驳）
- **多 LLM 任选**：DeepSeek / 阿里百炼 / 火山方舟 / SiliconFlow / OpenAI / Ollama
  — 一个环境变量切换，统一走 OpenAI 兼容协议
- **零成本默认栈**：DeepSeek API（极低）+ Edge-TTS（免费）+ 浏览器 STT（免费）

## 🧱 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Next.js 15 App Router + React 19 + Tailwind |
| 数字人 | pixi-live2d-display-lipsyncpatch + PixiJS 7 + Cubism 4 Core |
| 语音 | Edge-TTS (msedge-tts) 出语音；Web Speech API 做 STT |
| LLM | OpenAI 兼容协议 — DeepSeek / DashScope / Volcengine / SiliconFlow / OpenAI / Ollama |

## 🚀 本地启动（macOS / M4 Max 实测）

### 1. 依赖
```bash
npm install
```

### 2. 配置 LLM
复制环境变量模板：
```bash
cp .env.example .env.local
```
按需填入任意一家的 `*_API_KEY`，然后把 `LLM_PROVIDER` 切到对应 provider，例如：
```
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxxx
```

支持的 provider 与切换值：

| 值 | 说明 | 默认 model |
|---|---|---|
| `deepseek` | DeepSeek 官网 API (V4) | deepseek-v4-flash（陪练/prep）· deepseek-v4-pro（评委） |
| `dashscope` | 阿里云百炼（OpenAI 兼容模式） | qwen-plus |
| `volcengine` | 火山方舟，model 填 endpoint id `ep-xxx` | （需自填） |
| `siliconflow` | SiliconFlow | Qwen/Qwen2.5-32B-Instruct |
| `openai` | OpenAI 或任意兼容端点 | gpt-4o-mini |
| `ollama` | 本地 Ollama，需先 `ollama pull qwen2.5:14b-instruct` | qwen2.5:14b-instruct |

### 3. 下载 Live2D 模型与 Cubism Core
```bash
bash scripts/setup-live2d.sh
```
脚本会从 Live2D 官方 CDN 抓 Cubism 4 Core 运行时，并从官方示例仓库下载 Hiyori 模型到
`public/live2d/`。**Hiyori 是 Live2D Inc. 示例模型，仅供非商业演示**；上线请替换为自有/授权模型。

### 4. 启动开发服务器
```bash
npm run dev
```
打开 `http://localhost:3000`。建议使用 **Chrome** 以获得最佳 STT 体验。

### 5. 一分钟自检（可选）
```bash
# 已检测通过：MacBook Pro M4 Max 36G + Ollama qwen2.5:14b + Edge-TTS
npm run smoke
```
脚本会启动 dev server，依次打 `/api/chat` / `/api/tts` / `/api/score`，验证三条链路。

## 🗂 目录结构
```
app/
  page.tsx                # 模式入口
  debate/page.tsx         # 对手陪练（Live2D + 语音）
  judge/page.tsx          # 评委复盘
  prep/page.tsx           # 议题助理
  api/
    chat/route.ts         # LLM 代理（对手 + prep）
    score/route.ts        # 评委 JSON 评分
    tts/route.ts          # Edge-TTS 流
components/
  live2d/                 # 数字人舞台 + 唇形 hook
  chat/                   # 麦克风、TTS、消息组件
lib/
  llm.ts                  # 多家 OpenAI 兼容客户端
  prompts.ts              # 三场景 system prompts + 议题样例
  rubric.ts               # WSC 评分 schema
  parseEmotion.ts         # 解析 <emotion> 与 POI:
public/
  live2d/                 # Cubism core + 模型
scripts/
  setup-live2d.sh         # 抓 Cubism Core + Hiyori
DESIGN.md                 # 完整需求与方案设计
```

## 🛣 后续路线（非 MVP）
- 切换 talking-head 真人风格（MuseTalk / LatentSync，需 GPU）
- GPT-SoVITS 克隆教练专属嗓音，IP 化角色
- 多人 3v3 整场模拟（多 agent 编排）
- 录像回看 + 时序高亮 + 维度趋势
- 教练后台 + 班级数据看板

## ⚖️ 许可与商标
- 本仓库代码 MIT。
- **Live2D® Cubism**® 商标与 Cubism Core 运行时归 Live2D Inc. 所有；
  Hiyori 等示例模型仅限非商业演示。商业落地前请获取授权或采用自有模型。
- DeepSeek / 阿里 / 火山 / SiliconFlow / OpenAI API key 计费由各厂商决定。

参见 [DESIGN.md](./DESIGN.md) 了解完整设计推导与里程碑。
