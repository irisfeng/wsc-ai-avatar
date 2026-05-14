import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, currentProviderInfo, resolveJudgeModel } from '@/lib/llm';
import { judgeSystemPrompt, judgeUserPrompt, type JudgeInput } from '@/lib/prompts';
import { clampRubric, type RubricResult } from '@/lib/rubric';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: JudgeInput;
  try {
    body = (await req.json()) as JudgeInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.motion || !body.transcript) {
    return NextResponse.json(
      { error: 'motion and transcript required' },
      { status: 400 }
    );
  }

  const judgeModel = resolveJudgeModel();

  try {
    const raw = await chatCompletion(
      [
        { role: 'system', content: judgeSystemPrompt() },
        { role: 'user', content: judgeUserPrompt(body) }
      ],
      {
        temperature: 0.3,
        maxTokens: 900,
        responseFormat: 'json_object',
        model: judgeModel
      }
    );
    const parsed = safeParseJson(raw) as Partial<RubricResult> | null;
    if (!parsed) {
      return NextResponse.json(
        { error: 'LLM returned non-JSON', raw, provider: currentProviderInfo(judgeModel) },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ...clampRubric(parsed),
      provider: currentProviderInfo(judgeModel)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    // Try to extract first {...} block (some models wrap with ```json fences)
    const match = s.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
