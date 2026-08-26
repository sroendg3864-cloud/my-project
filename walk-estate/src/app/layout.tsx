import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WalkEstate · 임장로드',
  description:
    '가용 예산과 지역 데이터로 임장 후보지를 추천하고, 현장에서는 보행 전용 경로와 스마트 체크리스트로 주거·교육·안전 환경을 검증합니다.',
};

export const viewport: Viewport = {
  themeColor: '#ff385c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
