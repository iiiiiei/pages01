import type { Metadata } from "next";
import { Roboto, Story_Script } from "next/font/google";
import { DemoApp } from "@/components/demo/demo-app";
import "./globals.css";

const storyScriptFont = Story_Script({
  weight: "400",
  variable: "--font-story-script-family",
});

const robotoFont = Roboto({
  variable: "--font-roboto-family",
});

export const metadata: Metadata = {
  title: "IIIIIEI",
  description: "Interactive demo.",
};

export default function RootLayout(_: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${storyScriptFont.variable} ${robotoFont.variable} h-full antialiased`}>
      <body className="bg-black overscroll-none select-none font-roboto">
        <DemoApp />
      </body>
    </html>
  );
}
