import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { Space_Grotesk } from "next/font/google";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "에듀픽 - 학원 탐색부터 결제까지",
  description:
    "우리 아이 학원, 한눈에 비교하고 원클릭 신청. 학원 탐색, 일정관리, 결제, 공지를 하나로 통합한 레슨 플랫폼.",
  keywords: ["학원", "레슨", "학원 탐색", "학원 결제", "에듀픽", "edupick"],
};

export const viewport: Viewport = {
  themeColor: "#f5f7fb",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${spaceGrotesk.variable}`}>
      <body className="font-[var(--font-noto-sans-kr)] antialiased bg-background text-text-primary">
        <a href="#main-content" className="skip-link">
          본문으로 건너뛰기
        </a>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
          <div className="absolute left-[7%] top-24 h-28 w-28 rounded-full bg-white/80 blur-2xl" />
          <div className="absolute right-[10%] top-14 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="absolute bottom-20 right-[14%] h-40 w-40 rounded-full bg-blue-100/55 blur-3xl" />
          <div className="absolute bottom-[18%] left-[10%] h-48 w-48 rounded-full bg-cyan-100/40 blur-3xl" />
        </div>
        <QueryProvider>
          <div className="app-shell">{children}</div>
        </QueryProvider>
      </body>
    </html>
  );
}
