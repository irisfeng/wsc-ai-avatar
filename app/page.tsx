import Link from 'next/link';
import { Gavel, MessagesSquare, NotebookPen } from 'lucide-react';

const modes = [
  {
    href: '/debate',
    title: 'AI 对手陪练',
    desc: '数字人扮演对方辩手，按 WSC Team Debate 节奏立论 / 反驳 / 给 POI。',
    icon: MessagesSquare,
    badge: 'Most popular'
  },
  {
    href: '/judge',
    title: 'AI 评委复盘',
    desc: '粘贴或录入发言稿，按 Style / Content / Strategy 三维 70 分制打分。',
    icon: Gavel,
    badge: 'Adjudication'
  },
  {
    href: '/prep',
    title: '议题准备助理',
    desc: '输入 motion 自动生成正反方论点、定义、证据锚点与可能反驳。',
    icon: NotebookPen,
    badge: 'Prep notes'
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12">
        <span className="chip mb-3">World Scholar&apos;s Cup · MVP v0.1</span>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          卡通数字人 · WSC 辩论模拟训练
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Live2D 数字人 + 多家 LLM API + Edge-TTS 嘴型同步。本地零 GPU 跑通，
          覆盖陪练、评委、议题准备三大场景。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {modes.map(({ href, title, desc, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className="card group transition-colors hover:border-wsc-calm/60 hover:bg-white/[0.06]"
          >
            <div className="mb-3 flex items-center justify-between">
              <Icon className="h-6 w-6 text-wsc-calm" />
              <span className="chip">{badge}</span>
            </div>
            <h2 className="mb-1 text-lg font-semibold group-hover:text-wsc-calm">{title}</h2>
            <p className="text-sm text-white/60">{desc}</p>
          </Link>
        ))}
      </section>

      <footer className="mt-16 text-xs text-white/40">
        <p>
          Live2D Cubism is © Live2D Inc. — 示例模型用于非商业演示。
          上线请替换为授权或自有模型。
        </p>
      </footer>
    </main>
  );
}
