import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, type ChatMessage, currentProviderInfo } from '@/lib/llm';
import {
  opponentSystemPrompt,
  prepSystemPrompt,
  type DebateContext
} from '@/lib/prompts';

export const runtime = 'nodejs';

type Mode = 'opponent' | 'prep';

interface ChatBody {
  mode: Mode;
  messages: ChatMessage[];
  context?: Partial<DebateContext>;
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { mode, messages = [], context } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  let system: string;
  if (mode === 'opponent') {
    const ctx: DebateContext = {
      motion: context?.motion ?? 'This House Believes That AI helps students learn better.',
      userSide: context?.userSide ?? 'proposition',
      round: context?.round ?? 'opening'
    };
    system = opponentSystemPrompt(ctx);
  } else if (mode === 'prep') {
    system = prepSystemPrompt();
  } else {
    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  }

  const final: ChatMessage[] = [
    { role: 'system', content: system },
    ...messages.filter((m) => m.role !== 'system')
  ];

  try {
    const content = await chatCompletion(final, {
      temperature: mode === 'prep' ? 0.4 : 0.8,
      maxTokens: mode === 'prep' ? 1500 : 400
    });
    return NextResponse.json({
      content,
      provider: currentProviderInfo()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
