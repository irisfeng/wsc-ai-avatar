import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveJudgeModel, currentProviderInfo } from '@/lib/llm';

// Capture & restore env between tests since llm.ts reads process.env at call time.
const STASH_KEYS = [
  'LLM_PROVIDER',
  'JUDGE_MODEL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_MODEL',
  'DEEPSEEK_JUDGE_MODEL',
  'DEEPSEEK_BASE_URL',
  'DASHSCOPE_API_KEY',
  'DASHSCOPE_MODEL',
  'DASHSCOPE_JUDGE_MODEL',
  'OLLAMA_MODEL',
  'OLLAMA_JUDGE_MODEL'
] as const;

let stash: Record<string, string | undefined>;

beforeEach(() => {
  stash = {};
  for (const k of STASH_KEYS) {
    stash[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of STASH_KEYS) {
    if (stash[k] === undefined) delete process.env[k];
    else process.env[k] = stash[k];
  }
});

describe('resolveJudgeModel — three-tier fallback', () => {
  it('falls back to provider default when no override set', () => {
    process.env.LLM_PROVIDER = 'deepseek';
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    // DEEPSEEK_MODEL unset → uses built-in default
    expect(resolveJudgeModel()).toBe('deepseek-v4-flash');
  });

  it('uses <PROVIDER>_MODEL when set and no judge override', () => {
    process.env.LLM_PROVIDER = 'deepseek';
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    process.env.DEEPSEEK_MODEL = 'deepseek-custom-flash';
    expect(resolveJudgeModel()).toBe('deepseek-custom-flash');
  });

  it('prefers <PROVIDER>_JUDGE_MODEL over <PROVIDER>_MODEL', () => {
    process.env.LLM_PROVIDER = 'deepseek';
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    process.env.DEEPSEEK_MODEL = 'deepseek-v4-flash';
    process.env.DEEPSEEK_JUDGE_MODEL = 'deepseek-v4-pro';
    expect(resolveJudgeModel()).toBe('deepseek-v4-pro');
  });

  it('global JUDGE_MODEL trumps everything', () => {
    process.env.LLM_PROVIDER = 'deepseek';
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    process.env.DEEPSEEK_MODEL = 'flash';
    process.env.DEEPSEEK_JUDGE_MODEL = 'pro';
    process.env.JUDGE_MODEL = 'override-everything';
    expect(resolveJudgeModel()).toBe('override-everything');
  });

  it('works for ollama provider without API key (key not required)', () => {
    process.env.LLM_PROVIDER = 'ollama';
    process.env.OLLAMA_MODEL = 'qwen2.5:14b';
    expect(resolveJudgeModel()).toBe('qwen2.5:14b');
  });

  it('per-provider judge env is upper-case of provider key', () => {
    process.env.LLM_PROVIDER = 'dashscope';
    process.env.DASHSCOPE_API_KEY = 'sk-x';
    process.env.DASHSCOPE_JUDGE_MODEL = 'qwen-max';
    expect(resolveJudgeModel()).toBe('qwen-max');
  });
});

describe('currentProviderInfo', () => {
  it('returns provider key and effective model', () => {
    process.env.LLM_PROVIDER = 'ollama';
    process.env.OLLAMA_MODEL = 'qwen2.5:14b';
    expect(currentProviderInfo()).toEqual({
      provider: 'ollama',
      model: 'qwen2.5:14b'
    });
  });

  it('honors per-request modelOverride argument', () => {
    process.env.LLM_PROVIDER = 'ollama';
    process.env.OLLAMA_MODEL = 'qwen2.5:14b';
    expect(currentProviderInfo('llama3.2:3b')).toEqual({
      provider: 'ollama',
      model: 'llama3.2:3b'
    });
  });

  it('throws when paid provider has no API key', () => {
    process.env.LLM_PROVIDER = 'deepseek';
    // no DEEPSEEK_API_KEY
    expect(() => currentProviderInfo()).toThrow(/API key is empty/);
  });

  it('throws on unknown provider', () => {
    process.env.LLM_PROVIDER = 'bogus-provider';
    expect(() => currentProviderInfo()).toThrow(/Unknown LLM_PROVIDER/);
  });
});
