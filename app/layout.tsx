import type { Metadata } from "next";
import "./globals.css";
import { AptosWalletProvider } from "@/components/AptosWalletProvider";
import { ShelbyBackground } from "@/components/ShelbyBackground";

export const metadata: Metadata = {
  title: "Snake on Shelby - Web3 Neon Retro Arcade",
  description: "A classic retro snake mini-game powered exclusively by Shelbynet Testnet on Aptos infrastructure. Play, submit scores on-chain, and complete daily check-ins using ShelbyUSD.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="antialiased select-none bg-cyber-bg text-cyber-text relative">
        <AptosWalletProvider>
          <ShelbyBackground />
          {children}
        </AptosWalletProvider>
      </body>
    </html>
  );
}
