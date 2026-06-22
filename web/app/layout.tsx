import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import { ConstellationBg } from "@/components/ui/constellation-bg";
import "./globals.css";

const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://finhive.unitynodes.com"),
  title: "FinHive - private business banking on Canton",
  description: "Canton-native business banking with privacy-from-CFO. Role-scoped by cryptography, with an AI agent that pays within enforceable limits.",
  openGraph: {
    title: "FinHive - private business banking on Canton",
    description: "Privacy-from-CFO, enforced by the ledger. An AI agent that pays within cryptographic limits.",
    url: "https://finhive.unitynodes.com",
    siteName: "FinHive",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinHive - private business banking on Canton",
    description: "Privacy-from-CFO, enforced by the ledger. An AI agent that pays within cryptographic limits.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <link rel="stylesheet" href="https://db.onlinewebfonts.com/c/04e6981992c0e2e7642af2074ebe3901?family=Helvetica+Now+Display+Bold" />
      </head>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('has-js')" }} />
        <ConstellationBg />
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
