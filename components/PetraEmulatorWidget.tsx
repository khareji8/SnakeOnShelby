"use client";

import React, { useState, useEffect } from "react";
import { useAptosWallet } from "./AptosWalletProvider";
import { Wallet, Coins, RefreshCw, X, Radio, ArrowRight, ShieldAlert, Award } from "lucide-react";

export const PetraEmulatorWidget: React.FC = () => {
  const {
    isConnected,
    accountAddress,
    networkName,
    balance,
    points,
    isEmulator,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    mintFaucetTokens,
    showEmulatorPopup,
    emulatorTxPayload,
    resolveEmulatorTx
  } = useAptosWallet();

  const [isOpen, setIsOpen] = useState(true);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [activeNetworkLocal, setActiveNetworkLocal] = useState<string>("Devnet");

  // Keep network local selector in sync with provider
  useEffect(() => {
    if (networkName) {
      setActiveNetworkLocal(networkName);
    }
  }, [networkName]);

  const handleNetworkChangeLocally = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextNet = e.target.value;
    // Set network in provider by directly simulating network changes
    // Since provider is in emulator mode, we can manipulate network name
    // @ts-ignore
    const storedConnected = localStorage.getItem("shelby_emu_connected") === "true";
    const storedAddr = localStorage.getItem("shelby_emu_addr");
    const storedBal = parseFloat(localStorage.getItem("shelby_emu_bal") || "0.0");
    const storedPoints = parseInt(localStorage.getItem("shelby_emu_points") || "0", 10);
    const storedCheckIn = localStorage.getItem("shelby_emu_checkin");

    localStorage.setItem("shelby_emu_net", nextNet);
    // Reload state in window
    window.location.reload();
  };

  const handleMint = async () => {
    setFaucetLoading(true);
    setTimeout(async () => {
      await mintFaucetTokens();
      setFaucetLoading(false);
    }, 800);
  };

  if (!isEmulator) return null; // Only render emulator if no real extension is available

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && isConnected && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-cyber-panel border border-neon-blue border-opacity-60 text-cyber-blue font-cyber text-xs rounded-lg shadow-neon-blue transition-all duration-200 hover:scale-105 hover:bg-opacity-90"
        >
          <Wallet className="w-4 h-4 animate-bounce" />
          <span>OPEN PETRA EMULATOR</span>
        </button>
      )}

      {/* Main Emulator Panel */}
      {isOpen && isConnected && (
        <div className="fixed bottom-4 right-4 z-40 w-80 bg-cyber-panel bg-opacity-95 border-2 border-cyber-border rounded-xl shadow-2xl p-4 font-sans backdrop-blur-md overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <div className="flex items-center gap-2 text-cyber-blue font-cyber text-xs font-semibold tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-blue animate-pulse"></span>
              PETRA WALLET EMULATOR
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-cyber-dim hover:text-cyber-pink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Account & Network Selector */}
          <div className="mt-3 space-y-3">
            {/* Address */}
            <div className="bg-cyber-bg p-2.5 rounded-lg border border-cyber-border">
              <span className="text-[10px] text-cyber-dim font-cyber block tracking-widest uppercase">ADDRESS</span>
              <span className="font-mono text-sm text-cyber-text block mt-0.5 select-all cursor-pointer">
                {accountAddress}
              </span>
            </div>

            {/* Network Dropdown */}
            <div>
              <span className="text-[10px] text-cyber-dim font-cyber block mb-1 tracking-widest uppercase">WALLET NETWORK</span>
              <div className="relative">
                <select
                  value={activeNetworkLocal}
                  onChange={handleNetworkChangeLocally}
                  className="w-full bg-cyber-bg text-sm text-cyber-text py-2 px-3 rounded-lg border border-cyber-border focus:outline-none focus:border-cyber-blue appearance-none font-cyber font-medium"
                >
                  <option value="Devnet">Aptos Devnet</option>
                  <option value="Mainnet">Aptos Mainnet</option>
                  <option value="Shelbynet Testnet">Shelbynet Testnet</option>
                </select>
                <Radio className="absolute right-3 top-2.5 w-4 h-4 text-cyber-dim pointer-events-none" />
              </div>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* ShelbyUSD Balance */}
              <div className="bg-cyber-bg p-2.5 rounded-lg border border-cyber-border flex flex-col justify-between">
                <span className="text-[9px] text-cyber-dim font-cyber tracking-widest block uppercase">ShelbyUSD</span>
                <span className="text-lg font-cyber font-extrabold text-neon-green mt-1 flex items-center gap-1">
                  <Coins className="w-4 h-4 text-neon-green" />
                  {balance.toFixed(3)}
                </span>
              </div>

              {/* Bonus points */}
              <div className="bg-cyber-bg p-2.5 rounded-lg border border-cyber-border flex flex-col justify-between">
                <span className="text-[9px] text-cyber-dim font-cyber tracking-widest block uppercase">BONUS PTS</span>
                <span className="text-lg font-cyber font-extrabold text-neon-yellow mt-1 flex items-center gap-1">
                  <Award className="w-4 h-4 text-neon-yellow" />
                  {points}
                </span>
              </div>
            </div>

            {/* Faucet request button */}
            <button
              onClick={handleMint}
              disabled={faucetLoading}
              className={`w-full py-2.5 rounded-lg border border-opacity-40 font-cyber text-xs transition-all duration-200 uppercase tracking-widest flex items-center justify-center gap-2 ${
                faucetLoading
                  ? "bg-cyber-card border-cyber-dim text-cyber-dim"
                  : "bg-cyber-bg hover:bg-cyber-border border-neon-green text-neon-green hover:shadow-neon-green"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${faucetLoading ? "animate-spin" : ""}`} />
              {faucetLoading ? "MINTING..." : "MINT 10 ShelbyUSD"}
            </button>

            {/* Faucet Notice */}
            <div className="text-[10px] text-cyber-dim leading-relaxed text-center px-1">
              Faucet awards mock funds instantly to explore gameplay, score submissions, & check-ins.
            </div>
          </div>
        </div>
      )}

      {/* Retro Transaction Popup Modal */}
      {showEmulatorPopup && emulatorTxPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-cyber-panel border-2 border-neon-pink rounded-xl shadow-neon-pink p-5 crt-screen">
            {/* Warning blinking header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-cyber-pink bg-opacity-10 border border-cyber-pink border-opacity-35 rounded-lg text-cyber-pink mb-4 animate-pulse-slow">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-bounce" />
              <div>
                <span className="font-arcade text-[10px] block leading-none tracking-wider font-extrabold uppercase">
                  TRANSACTION REQUEST
                </span>
                <span className="font-sans text-[10px] opacity-80 block mt-0.5">
                  Petra Wallet Signature Verification
                </span>
              </div>
            </div>

            {/* Tx Details */}
            <div className="bg-cyber-bg p-4 rounded-lg border border-cyber-border font-mono text-xs space-y-3 mb-5">
              <div className="flex justify-between border-b border-cyber-border pb-1.5">
                <span className="text-cyber-dim uppercase text-[10px]">PAYER ADDRESS</span>
                <span className="text-cyber-text truncate w-40 text-right">{accountAddress}</span>
              </div>

              <div className="flex justify-between border-b border-cyber-border pb-1.5">
                <span className="text-cyber-dim uppercase text-[10px]">CONTRACT ACTION</span>
                <span className="text-cyber-blue text-right font-semibold truncate w-44">
                  {emulatorTxPayload?.function?.split("::")[2]?.replace(/_/g, " ").toUpperCase() || "CALL_CONTRACT"}
                </span>
              </div>

              <div className="flex justify-between border-b border-cyber-border pb-1.5">
                <span className="text-cyber-dim uppercase text-[10px]">PAYMENT VALUE</span>
                <span className="text-neon-green text-right font-bold">0.001 ShelbyUSD</span>
              </div>

              <div className="flex justify-between pb-0.5">
                <span className="text-cyber-dim uppercase text-[10px]">GAS ESTIMATE</span>
                <span className="text-cyber-text text-right">0.00002 Shelby</span>
              </div>
            </div>

            {/* Prompt */}
            <div className="text-xs text-cyber-text font-medium leading-relaxed mb-5 text-center px-4">
              Do you authorize the smart contract to transfer <strong className="text-neon-green">0.001 ShelbyUSD</strong> on Shelbynet Testnet?
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 font-cyber text-xs">
              <button
                onClick={() => resolveEmulatorTx(false)}
                className="w-full py-3 bg-cyber-bg hover:bg-cyber-card border border-cyber-border rounded-lg text-cyber-text hover:text-cyber-pink transition-all font-semibold uppercase tracking-wider"
              >
                REJECT
              </button>
              <button
                onClick={() => resolveEmulatorTx(true)}
                className="w-full py-3 bg-cyber-pink hover:bg-opacity-90 rounded-lg text-white font-extrabold shadow-neon-pink transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 hover:scale-[1.02]"
              >
                <span>APPROVE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
