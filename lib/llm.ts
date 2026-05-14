/**
 * Unified OpenAI-compatible LLM client.
 * DeepSeek / DashScope (百炼) / Volcengine ARK (火山) / SiliconFlow / OpenAI / Ollama
 * — all expose `/chat/completions` with the same payload shape.
 */

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

type ProviderKey =
  | 'deepseek'
  | 'dashscope'
  | 'volcengine'
  | 'siliconflow'
  | 'openai'
  | 'ollama';

interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function resolveProvider(): { key: ProviderKey; cfg: ProviderConfig } {
  const key = (process.env.LLM_PROVIDER || 'deepseek').toLowerCase() as ProviderKey;
  const table: Record<ProviderKey, ProviderConfig> = {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      // V4 family (May 2026). deepseek-chat / deepseek-reasoner are kept as
      // backward-compat aliases by DeepSeek but slated for deprecation.
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
    },
    dashscope: {
      apiKey: process.env.DASHSCOPE_API_KEY || '',
      baseUrl:
        process.env.DASHSCOPE_BASE_URL ||
        'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: process.env.DASHSCOPE_MODEL || 'qwen-plus'
    },
    volcengine: {
      apiKey: process.env.VOLCENGINE_API_KEY || '',
      baseUrl:
        process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      model: process.env.VOLCENGINE_MODEL || ''
    },
    siliconflow: {
      apiKey: process.env.SILICONFLOW_API_KEY || '',
      baseUrl: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-32B-Instruct'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    },
    ollama: {
      apiKey: 'ollama',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      model: process.env.OLLAMA_MODEL || 'qwen2.5:14b'
    }
  };
  if (!(key in table)) {
    throw new Error(`Unknown LLM_PROVIDER: ${key}`);
  }
  const cfg = table[key];
  if (key !== 'ollama' && !cfg.apiKey) {
    throw new Error(
      `LLM provider "${key}" selected but its API key is empty. Set it in .env.local`
    );
  }
  return { key, cfg };
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
  /**
   * Per-request model override. Falls back to the provider's default model.
   * Used to let /api/score pick a stronger reasoning model (e.g. deepseek-v4-pro)
   * while /api/chat keeps the cheap chat model (deepseek-v4-flash).
   */
  model?: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<string> {
  const { cfg } = resolveProvider();
  const model = opts.model || cfg.model;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    stream: false
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`LLM ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? '';
}

export function currentProviderInfo(modelOverride?: string) {
  const { key, cfg } = resolveProvider();
  return { provider: key, model: modelOverride || cfg.model };
}

/**
 * Per-provider judge model. When unset, the regular *_MODEL is reused
 * (so single-model deployments still work).
 *
 * Resolution order:
 *   1. JUDGE_MODEL                (provider-agnostic override; highest priority)
 *   2. <PROVIDER>_JUDGE_MODEL     (per-provider override)
 *   3. <PROVIDER>_MODEL           (chat default)
 */
export function resolveJudgeModel(): string {
  const generic = process.env.JUDGE_MODEL;
  if (generic) return generic;
  const { key, cfg } = resolveProvider();
  const perProvider =
    process.env[`${key.toUpperCase()}_JUDGE_MODEL` as keyof NodeJS.ProcessEnv];
  return perProvider || cfg.model;
}
