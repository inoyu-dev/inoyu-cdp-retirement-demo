import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import DemoUsageTracker from "@/components/DemoUsageTracker";
import { QuizLocaleProvider } from "@/components/QuizLocaleProvider";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Free Retirement Score | Your Retirement Guide",
  description:
    "A simple, free retirement readiness check for people planning to retire in the next few years.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <QuizLocaleProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <SiteHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <DemoUsageTracker />
          <SiteFooter />
        </QuizLocaleProvider>
      </body>
    </html>
  );
}
