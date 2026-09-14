import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nebula AMM | Swap & Provide Liquidity on Solana",
  description:
    "A decentralized AMM built on Solana. Swap tokens, provide liquidity, and earn fees with near-zero transaction costs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-dvh flex flex-col bg-bg-primary text-text-primary antialiased">
        <SolanaProvider>
          <Navbar />
          <main className="flex-1 relative">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />
            </div>
            <div className="relative z-10">{children}</div>
          </main>
        </SolanaProvider>
      </body>
    </html>
  );
}
