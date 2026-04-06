import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";


// --- Font Configuration ---

const notoSansKR = Noto_Sans_KR({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-noto-sans-kr",
    display: "swap",
});


// --- Metadata ---

export const metadata: Metadata = {
    title: "ThinkBridge - AI 소크라테스식 튜터링",
    description: "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI. 소크라테스식 질문법으로 학생의 사고를 유도하는 1:1 튜터링 시스템.",
    keywords: ["AI", "튜터링", "소크라테스", "교육", "사고력", "ThinkBridge"],
};


// --- Root Layout ---

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>)
{
    return (
        <html lang="ko" className={notoSansKR.variable}>
            <body className={`${notoSansKR.className} antialiased`}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
