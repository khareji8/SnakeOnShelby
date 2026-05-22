"use client";

import React, { useState, useEffect } from "react";
import { useAptosWallet } from "@/components/AptosWalletProvider";
import { SnakeGame } from "@/components/SnakeGame";
import { Leaderboard } from "@/components/Leaderboard";
import { WalletSelectorModal } from "@/components/WalletSelectorModal";
import {
  Wallet,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Coins,
  ChevronRight,
  Award,
  Sparkles,
  User,
  LogOut,
  Copy
} from "lucide-react";
import confetti from "canvas-confetti";

export default function Home() {
  const {
    isConnected,
    accountAddress,
    networkName,
    balance,
    points,
    userHighScore,
    isNetworkWrong,
    hasPetraExtension,
    hasMartianExtension,
    hasPontemExtension,
    hasOkxExtension,
    hasNightlyExtension,
    hasRabbyExtension,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    dailyCheckInDate,
    performDailyCheckIn
  } = useAptosWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [leaderboardSync, setLeaderboardSync] = useState(0);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  
  // Profile dropdown states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load personal game history when wallet connects
  useEffect(() => {
    if (accountAddress) {
      const historyKey = `shelby_game_history_${accountAddress}`;
      try {
        const stored = JSON.parse(localStorage.getItem(historyKey) || "[]");
        setGameHistory(stored);
      } catch(e) {
        setGameHistory([]);
      }
    } else {
      setGameHistory([]);
    }
  }, [accountAddress, leaderboardSync]);
  
  // Daily Check-In timer states
  const [cooldownText, setCooldownText] = useState<string | null>(null);
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [checkInErrorText, setCheckInErrorText] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  
  // Streak states
  const [checkInHistory, setCheckInHistory] = useState<string[]>([]);
  
  useEffect(() => {
    if (accountAddress) {
      const key = `shelby_checkin_days_${accountAddress}`;
      let history = [];
      try { history = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
      
      // Backfill history based on on-chain points if local storage is empty
      if (history.length === 0 && points > 0) {
        const days = Math.floor(points / 10);
        const baseDate = dailyCheckInDate ? new Date(dailyCheckInDate) : new Date();
        for (let i = 0; i < days; i++) {
           const d = new Date(baseDate);
           d.setDate(d.getDate() - i);
           history.push(d.toISOString().split('T')[0]);
        }
        localStorage.setItem(key, JSON.stringify(history));
      }
      setCheckInHistory(history);
    }
  }, [accountAddress, points, dailyCheckInDate]);

  // Sound Synthesizer helper for page actions
  const playPageSound = (frequency: number, duration: number, type: OscillatorType = "sine") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log("Audio not supported or blocked");
    }
  };

  // Cooldown countdown manager
  useEffect(() => {
    if (!dailyCheckInDate) {
      setCooldownText(null);
      return;
    }

    const interval = setInterval(() => {
      const lastCheck = new Date(dailyCheckInDate).getTime();
      const now = new Date().getTime();
      const diffMs = now - lastCheck;
      const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours

      if (diffMs >= cooldownMs) {
        setCooldownText(null);
        clearInterval(interval);
      } else {
        const remainingMs = cooldownMs - diffMs;
        const hrs = Math.floor(remainingMs / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
        
        setCooldownText(
          `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dailyCheckInDate]);

  // Handle score submits from snake game to trigger a refresh of the global leaderboard
  const handleScoreSubmitted = (score: number) => {
    // Save personal history to local storage
    if (accountAddress) {
      const historyKey = `shelby_game_history_${accountAddress}`;
      let existing = [];
      try { existing = JSON.parse(localStorage.getItem(historyKey) || "[]"); } catch (e) {}
      
      existing.unshift({ score, date: new Date().toISOString() });
      localStorage.setItem(historyKey, JSON.stringify(existing.slice(0, 30))); // Keep last 30 games
    }

    // Increment key to trigger leaderboard refresh from blockchain and local history
    setTimeout(() => setLeaderboardSync(prev => prev + 1), 2000); // 2 second delay to let indexer sync
  };

  // Perform daily check-in
  const handleDailyCheckIn = async () => {
    if (isCheckInLoading || cooldownText || isNetworkWrong || !isConnected) return;

    if (balance < 0.001) {
      setCheckInErrorText("Insufficient balance. Mint ShelbyUSD from Faucet.");
      playPageSound(150, 0.4, "sawtooth");
      return;
    }

    setCheckInErrorText(null);
    setCheckInSuccess(false);
    setIsCheckInLoading(true);
    playPageSound(587.33, 0.15, "triangle"); // Quick beep

    try {
      await performDailyCheckIn();
      
      // Success triggers confetti
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.8 },
        colors: ["#ffdf00", "#00e5ff", "#00ff66"]
      });

      setCheckInSuccess(true);
      playPageSound(880, 0.4, "sine"); // Sweet successful beep
      
      // Update local streak history
      if (accountAddress) {
        const today = new Date().toISOString().split('T')[0];
        const key = `shelby_checkin_days_${accountAddress}`;
        const newHistory = [...checkInHistory];
        if (!newHistory.includes(today)) {
           newHistory.push(today);
           localStorage.setItem(key, JSON.stringify(newHistory));
           setCheckInHistory(newHistory);
        }
      }

      // Inject points to leaderboard too!
      handleScoreSubmitted(points + 10);
    } catch (e: any) {
      console.error(e);
      setCheckInErrorText(e.message || "Daily check-in transaction rejected.");
      playPageSound(150, 0.4, "sawtooth");
    } finally {
      setIsCheckInLoading(false);
    }
  };

  // Streak calculations
  const getWeekDays = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const calculateStreaks = (history: string[]) => {
    const sorted = Array.from(new Set(history)).sort().reverse();
    if (sorted.length === 0) return { current: 0, best: 0 };
    
    let current = 1;
    let best = 1;
    let temp = 1;
    
    for (let i = 0; i < sorted.length - 1; i++) {
       const d1 = new Date(sorted[i]);
       const d2 = new Date(sorted[i+1]);
       const diffDays = Math.ceil(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
       if (diffDays === 1) {
         temp++;
         if (temp > best) best = temp;
       } else {
         temp = 1;
       }
    }
    
    let currTemp = 1;
    const todayStr = new Date().toISOString().split('T')[0];
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];
    
    if (sorted[0] !== todayStr && sorted[0] !== yestStr) {
       currTemp = 0;
    }
    
    if (currTemp > 0) {
      for (let i = 0; i < sorted.length - 1; i++) {
         const d1 = new Date(sorted[i]);
         const d2 = new Date(sorted[i+1]);
         const diffDays = Math.ceil(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
         if (diffDays === 1) {
           currTemp++;
         } else {
           break;
         }
      }
    }
    return { current: currTemp, best: Math.max(best, currTemp) };
  };

  const weekDays = getWeekDays();
  const { current: currentStreak, best: bestStreak } = calculateStreaks(checkInHistory);
  const todayDateStr = new Date().toISOString().split('T')[0];

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-between pb-12 font-sans bg-transparent z-10">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-neon-green rounded-full opacity-[0.02] blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-cyber-pink rounded-full opacity-[0.02] blur-3xl pointer-events-none"></div>

      {/* Real-time Wrong Network Banner */}
      {isConnected && isNetworkWrong && (
        <div className="w-full bg-cyber-pink bg-opacity-95 text-white border-b-2 border-cyber-pink shadow-neon-pink z-50 flex flex-col sm:flex-row items-center justify-center p-3.5 sticky top-0 transition-all duration-300 font-cyber text-xs gap-3 sm:gap-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
            <div className="font-cyber font-bold tracking-widest text-[11px] sm:text-xs">
              NETWORK MISMATCH: PLEASE SWITCH TO SHELBYNET TESTNET
            </div>
          </div>
          <div className="bg-black bg-opacity-30 rounded px-3 py-1.5 text-[10px] tracking-wider font-semibold border border-white border-opacity-20 flex items-center gap-2">
            <span>Open Wallet Extension &rarr; Network &rarr; Select "Shelbynet Testnet"</span>
          </div>
        </div>
      )}

      {/* Main Responsive Header */}
      <header className="w-full max-w-6xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-cyber-border mb-8 backdrop-blur-md sticky top-0 bg-cyber-panel bg-opacity-40 z-30">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-neon-green flex items-center justify-center shadow-neon-green bg-neon-green bg-opacity-5 overflow-hidden">
            <img src="/snake-logo.png" alt="Snake Logo" className="w-full h-full object-cover animate-pulse" />
          </div>
          <div>
            <h1 className="font-cyber text-base font-black text-white tracking-widest">
              Snake On Shelby
            </h1>
            <span className="text-[9px] text-neon-green font-cyber tracking-widest block uppercase">
              SHELBynet TESTNET ARCADE
            </span>
          </div>
        </div>

        {/* Header interactive Wallet state */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-2">
              {/* Network Badge */}
              <div
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-cyber text-[9px] tracking-wider font-semibold ${
                  isNetworkWrong
                    ? "bg-red-500 bg-opacity-10 border-red-500 border-opacity-50 text-red-400"
                    : "bg-purple-500 bg-opacity-10 border-purple-500 border-opacity-50 text-purple-300"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isNetworkWrong ? "bg-red-500" : "bg-purple-400"} animate-pulse`}></span>
                {networkName || "UNKNOWN"}
              </div>

              {/* Balance display */}
              <div className="bg-black bg-opacity-40 border border-purple-700 border-opacity-50 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs">
                <Coins className="w-4 h-4 text-purple-400" />
                <span className="font-mono text-white font-bold">{balance.toFixed(3)} SBY-USD</span>
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-10 h-10 border border-purple-700 border-opacity-50 hover:border-neon-blue text-purple-300 hover:text-neon-blue rounded-lg transition-all bg-black bg-opacity-30 flex items-center justify-center shadow-lg"
                >
                  <User className="w-4 h-4" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-cyber-panel border border-cyber-border rounded-xl shadow-2xl z-50 overflow-hidden font-cyber">
                    {/* Header: Wallet Address */}
                    <div className="px-4 py-3 bg-black bg-opacity-40 border-b border-cyber-border relative">
                      <span className="text-[9px] text-cyber-dim tracking-widest uppercase block mb-1">
                        CONNECTED WALLET
                      </span>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-white font-mono tracking-wider">
                          {accountAddress ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}` : "Unknown"}
                        </span>
                        <button
                          onClick={() => {
                            if (accountAddress) navigator.clipboard.writeText(accountAddress);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="text-cyber-dim hover:text-neon-green transition-colors"
                          title="Copy Address"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {copied && (
                        <span className="text-[8px] text-neon-green uppercase tracking-widest absolute right-4 top-3">Copied!</span>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-cyber-border border-opacity-50">
                        <div>
                          <span className="text-[8px] text-cyber-dim tracking-widest uppercase block">TOTAL POINTS</span>
                          <span className="text-sm font-black text-neon-green">
                            {points} <span className="text-[9px] text-cyber-dim ml-1 font-semibold">({Math.floor(points / 10)} DAYS)</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-cyber-dim tracking-widest uppercase block">HIGH SCORE</span>
                          <span className="text-sm font-black text-neon-yellow">{userHighScore || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Game History */}
                    <div className="bg-cyber-bg bg-opacity-80 px-4 py-2 border-b border-cyber-border max-h-48 overflow-y-auto">
                      <span className="text-[9px] text-cyber-dim tracking-widest uppercase block mb-2 sticky top-0 bg-cyber-bg py-1 z-10 border-b border-cyber-border border-opacity-30">
                        RECENT MATCHES
                      </span>
                      {gameHistory.length > 0 ? (
                        <div className="space-y-2">
                          {gameHistory.map((game, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-cyber-dim font-medium text-[9px] tracking-wider">
                                {new Date(game.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(game.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="font-cyber font-bold text-neon-blue">{game.score} PTS</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-[9px] text-cyber-dim tracking-widest uppercase">
                          NO RECENT GAMES
                        </div>
                      )}
                    </div>
                    
                    {/* Options */}
                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          disconnectWallet();
                        }}
                        className="w-full px-3 py-2 text-left text-cyber-pink hover:bg-cyber-pink hover:bg-opacity-10 rounded-lg text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="px-5 py-2.5 font-cyber text-[10px] font-black tracking-widest rounded-lg transition-all flex items-center gap-2 uppercase text-white hover:scale-[1.04] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)",
                boxShadow: "0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(124, 58, 237, 0.3)",
              }}
            >
              <Wallet className="w-4 h-4" />
              CONNECT WALLET
            </button>
          )}
        </div>
      </header>

      {/* Main Arcade Cabinet Body */}
      <div className="w-full max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Game Console Screen (Left 7-columns) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <SnakeGame onScoreSubmitted={handleScoreSubmitted} />
        </div>

        {/* Cyber Panels Dashboard (Right 5-columns) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Daily Check-In Cyber Widget */}
          <div className="w-full bg-cyber-panel bg-opacity-65 backdrop-blur-sm border border-cyber-border rounded-2xl p-5 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-pink rounded-full opacity-[0.01] blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyber-pink" />
                <h3 className="font-cyber text-sm font-bold tracking-wider text-white uppercase">
                  DAILY COOLDOWN CHECK-IN
                </h3>
              </div>
              <span className="text-[9px] bg-cyber-pink bg-opacity-10 border border-cyber-pink border-opacity-30 text-cyber-pink font-cyber font-semibold px-2 py-0.5 rounded tracking-widest">
                +10 PTS
              </span>
            </div>

            <p className="text-xs text-cyber-text leading-relaxed font-medium mb-5">
              Check in once every 24 hours to secure <strong className="text-neon-yellow">10 Bonus Points</strong>. Trigger a network transaction fee of exactly <strong className="text-neon-green">0.001 ShelbyUSD</strong>.
            </p>

            {/* 7-Day Week UI */}
            <div className="mb-6 bg-black bg-opacity-40 p-3 rounded-xl border border-cyber-border">
              <div className="flex justify-between items-center mb-3">
                {weekDays.map((d, i) => {
                  const dateStr = d.toISOString().split('T')[0];
                  const isChecked = checkInHistory.includes(dateStr);
                  const isPast = dateStr < todayDateStr;
                  const isToday = dateStr === todayDateStr;
                  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <span className={`text-[9px] font-cyber tracking-widest ${isToday ? "text-white" : "text-cyber-dim"}`}>
                        {dayNames[i]}
                      </span>
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-white border-[#d946ef]"
                          : isPast
                          ? "bg-white bg-opacity-10 border-transparent text-cyber-dim"
                          : "bg-white border-transparent"
                      }`}>
                        {isChecked ? (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                          </div>
                        ) : isPast ? (
                           <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center px-1 font-cyber text-[10px] tracking-widest">
                <div className="bg-pink-500 bg-opacity-10 border border-purple-500 border-opacity-30 text-pink-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>Best Streak</span>
                  <svg className="w-3 h-3 fill-current text-purple-400" viewBox="0 0 24 24"><path d="M12 2C12 2 15 7 15 11C15 12.5 14 14 12 14C10 14 9 12.5 9 11C9 7 12 2 12 2Z"></path></svg>
                  <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">{bestStreak}</span>
                </div>
                <div className="bg-white bg-opacity-5 border border-white border-opacity-10 text-cyber-dim px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>Current Streak</span>
                  <svg className="w-3 h-3 fill-current text-white" viewBox="0 0 24 24"><path d="M12 2C12 2 15 7 15 11C15 12.5 14 14 12 14C10 14 9 12.5 9 11C9 7 12 2 12 2Z"></path></svg>
                  <span className="font-bold text-white">{currentStreak}</span>
                </div>
              </div>
            </div>

            {/* Check in action trigger */}
            <button
              onClick={handleDailyCheckIn}
              disabled={!!cooldownText || isCheckInLoading || isNetworkWrong || !isConnected}
              className={`w-full py-3.5 rounded-xl font-cyber text-xs tracking-widest uppercase transition-all duration-200 border flex items-center justify-center gap-2 ${
                !isConnected
                  ? "bg-cyber-card border-cyber-border text-cyber-dim cursor-not-allowed"
                  : isNetworkWrong
                  ? "bg-cyber-card border-cyber-pink border-opacity-30 text-cyber-pink cursor-not-allowed"
                  : cooldownText
                  ? "bg-cyber-bg border-cyber-border text-cyber-dim cursor-not-allowed font-mono"
                  : isCheckInLoading
                  ? "bg-cyber-bg border-cyber-dim text-cyber-dim cursor-wait animate-pulse"
                  : "bg-cyber-pink hover:bg-opacity-95 text-white border-cyber-pink hover:scale-[1.01] shadow-neon-pink"
              }`}
            >
              {isCheckInLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>SIGNING TRANSACTION...</span>
                </>
              ) : cooldownText ? (
                <>
                  <span>COOLDOWN: {cooldownText}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current animate-pulse" />
                  <span>CLAIM DAILY CHECK-IN</span>
                </>
              )}
            </button>

            {/* Feedback reports */}
            {checkInSuccess && (
              <div className="mt-3 text-center text-neon-green font-cyber text-[9px] uppercase tracking-widest animate-pulse">
                [SUCCESS] claimed +10 Bonus points successfully!
              </div>
            )}
            {checkInErrorText && (
              <div className="mt-3 text-center text-cyber-pink font-cyber text-[9px] uppercase tracking-widest animate-pulse">
                [ERROR] {checkInErrorText}
              </div>
            )}
          </div>

          {/* Leaderboard Module */}
          <Leaderboard scoreSyncKey={leaderboardSync} />

          {/* Quick instructions / Help board */}
          <div className="bg-cyber-panel bg-opacity-35 backdrop-blur-sm border border-cyber-border rounded-2xl p-4 font-sans text-xs space-y-2.5 shadow-xl leading-relaxed">
            <h4 className="font-cyber text-[10px] text-cyber-blue font-bold tracking-widest uppercase mb-2">
              SHELBYNET TERMINAL HANDBOOK
            </h4>
            <div className="flex gap-2.5 items-start">
              <ChevronRight className="w-3.5 h-3.5 text-cyber-blue flex-shrink-0 mt-0.5" />
              <p className="text-cyber-text">
                Ensure you are on the <strong className="text-cyber-blue">Shelbynet Testnet</strong> to access the transaction pipeline.
              </p>
            </div>
            <div className="flex gap-2.5 items-start">
              <ChevronRight className="w-3.5 h-3.5 text-cyber-blue flex-shrink-0 mt-0.5" />
              <p className="text-cyber-text">
                You will need the <strong className="text-cyber-blue">Petra Wallet Extension</strong> installed to connect and play.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Wallet Selector Modal */}
      <WalletSelectorModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        hasPetraExtension={hasPetraExtension}
        hasMartianExtension={hasMartianExtension}
        hasPontemExtension={hasPontemExtension}
        hasOkxExtension={hasOkxExtension}
        hasNightlyExtension={hasNightlyExtension}
        hasRabbyExtension={hasRabbyExtension}
        onConnectWallet={async (walletId: string) => {
          await connectWallet(walletId);
        }}
      />

      {/* Global pixel footer */}
      <footer className="mt-16 text-center z-10 text-[9px] font-cyber text-[#7c3aed] tracking-widest uppercase space-y-1.5 select-none opacity-70">
        <div>Snake On Shelby © 2026 DECENTRALIZED ARCADE CORP</div>
        <div className="animate-pulse">POWERED BY APTOS INFRASTRUCTURE &amp; SHELBY STORAGE PROTOCOL</div>
      </footer>
    </main>
  );
}
