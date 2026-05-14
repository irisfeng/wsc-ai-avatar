import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WSC AI Avatar — 卡通数字人辩论训练',
  description: 'World Scholar\'s Cup 辩论模拟训练 · AI 对手 / 评委 / 议题助理'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="bg-wsc-ink text-wsc-paper">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
