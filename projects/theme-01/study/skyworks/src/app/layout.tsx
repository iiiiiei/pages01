import type { Metadata } from "next";
import { Roboto, Story_Script } from "next/font/google";
import { Renderer } from "@/components/renderer";
import "./globals.css";
import Image from "next/image";
import { LoadingScreen } from "@/components/loading-screen";
import { ScrollContainer } from "@/components/scroll-container";

const storyScriptFont = Story_Script({
  weight: "400",
  variable: "--font-story-script-family",
});

const robotoFont = Roboto({
  variable: "--font-roboto-family",
});

export const metadata: Metadata = {
  title: "IIIIIEI — 创意开发工作室",
  description: "我坚信生活是艺术的低语。专注 WebGL 与生成式视觉。",
};

export default function RootLayout(_: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${storyScriptFont.variable} ${robotoFont.variable} h-full antialiased`}>
      <body className="bg-black overflow-hidden overscroll-none select-none font-roboto">
        <header className="fixed z-1000 top-0 left-0 p-6">
          <Image src="/logo.svg" alt="logo" width={250} height={100} className="w-[150px] lg:w-[250px]" />
        </header>
        <ScrollContainer>
          <Renderer />
        </ScrollContainer>
        <LoadingScreen />
      </body>
    </html>
  );
}
