"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Shield, CircleDot, User } from "lucide-react";
import { useAptosWallet } from "./AptosWalletProvider";

interface LeaderboardItem {
  address: string;
  score: number;
  date: string;
  isPlayer?: boolean;
}

interface LeaderboardProps {
  scoreSyncKey: number; // Increment this to force reload leaderboard
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ scoreSyncKey }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [historyScores, setHistoryScores] = useState<LeaderboardItem[]>([]);
  const [activeTab, setActiveTab] = useState<"GLOBAL" | "HISTORY">("GLOBAL");
  const [searchQuery, setSearchQuery] = useState("");
  const { accountAddress } = useAptosWallet();

  useEffect(() => {
    let isMounted = true;
    
    const fetchRealLeaderboard = async () => {
      try {
        const res = await fetch("https://api.shelbynet.shelby.xyz/v1/accounts/0x75ae89e208f02fc681cc308f9cd505242a22a805e09ba21ca15732e86df0169d/resources");
        if (!res.ok) return;
        const resources = await res.json();
        
        const lbResource = resources.find((r: any) => r.type === "0x75ae89e208f02fc681cc308f9cd505242a22a805e09ba21ca15732e86df0169d::snake_arcade::GlobalLeaderboard");
        
        if (lbResource && lbResource.data && lbResource.data.records) {
          const userStr = accountAddress ? accountAddress.toString().toLowerCase() : "";
          const formatted = lbResource.data.records.map((r: any) => ({
            address: r.player.slice(0, 7) + "..." + r.player.slice(-5),
            score: parseInt(r.score),
            date: new Date(parseInt(r.timestamp) * 1000).toISOString(),
            isPlayer: userStr !== "" && r.player.toLowerCase() === userStr
          }));
          
          if (isMounted) setLeaderboard(formatted);
        }
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      }
    };
    
    const fetchLocalHistory = () => {
      if (accountAddress) {
        const historyKey = `shelby_game_history_${accountAddress}`;
        try {
          const stored = JSON.parse(localStorage.getItem(historyKey) || "[]");
          const formatted = stored.map((s: any) => ({
            address: "YOU",
            score: s.score,
            date: s.date,
            isPlayer: true
          }));
          if (isMounted) setHistoryScores(formatted);
        } catch(e) {}
      } else {
        if (isMounted) setHistoryScores([]);
      }
    };
    
    fetchRealLeaderboard();
    fetchLocalHistory();
    
    // Poll every 15 seconds to keep leaderboard fresh
    const interval = setInterval(() => {
      fetchRealLeaderboard();
      fetchLocalHistory();
    }, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [scoreSyncKey, accountAddress]);

  return (
    <div className="w-full bg-cyber-panel bg-opacity-65 backdrop-blur-sm border border-cyber-border rounded-2xl shadow-2xl p-5 overflow-hidden relative">
      {/* Glow highlight */}
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-neon-blue rounded-full opacity-[0.03] blur-xl"></div>
      
      {/* Title / Tabs */}
      <div className="flex items-center gap-4 mb-4 border-b border-cyber-border border-opacity-50 pb-2">
        <button 
          onClick={() => setActiveTab("GLOBAL")}
          className={`flex items-center gap-2 font-cyber text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === "GLOBAL" ? "text-white" : "text-cyber-dim hover:text-cyber-blue"}`}
        >
          <Trophy className={`w-4 h-4 ${activeTab === "GLOBAL" ? "text-neon-blue animate-pulse" : ""}`} />
          GLOBAL RANK
        </button>
        <div className="w-px h-4 bg-cyber-border"></div>
        <button 
          onClick={() => setActiveTab("HISTORY")}
          className={`flex items-center gap-2 font-cyber text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === "HISTORY" ? "text-white" : "text-cyber-dim hover:text-neon-green"}`}
        >
          <User className={`w-4 h-4 ${activeTab === "HISTORY" ? "text-neon-green animate-pulse" : ""}`} />
          MY HISTORY
        </button>
      </div>

      <div className="text-[10px] text-cyber-dim font-cyber mb-4 tracking-widest leading-relaxed uppercase border-b border-cyber-border pb-2 flex justify-between">
        <span>{activeTab === "GLOBAL" ? "ARCADE RUNNERS" : "PAST MATCHES"}</span>
        <span>SCORE</span>
      </div>

      {activeTab === "GLOBAL" && (
        <div className="mb-4">
          <input 
            type="text" 
            placeholder="Search Wallet Address (e.g. 0x123...)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black bg-opacity-40 border border-cyber-border rounded px-3 py-1.5 text-xs text-white font-mono placeholder-cyber-dim focus:outline-none focus:border-neon-blue transition-colors"
          />
        </div>
      )}

      {/* Ranks list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {activeTab === "GLOBAL" 
          ? leaderboard
              .map((item, i) => ({ ...item, originalRank: i + 1 }))
              .filter(item => item.address.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((item, index) => {
                const rank = item.originalRank;
                let rankColor = "text-cyber-dim border-cyber-border";
                
                if (rank === 1) {
                  rankColor = "text-yellow-400 border-yellow-400 bg-yellow-400 bg-opacity-10 shadow-[0_0_10px_rgba(250,204,21,0.3)]";
                } else if (rank === 2) {
                  rankColor = "text-gray-300 border-gray-300 bg-gray-300 bg-opacity-10 shadow-[0_0_10px_rgba(209,213,219,0.3)]";
                } else if (rank === 3) {
                  rankColor = "text-amber-600 border-amber-600 bg-amber-600 bg-opacity-10 shadow-[0_0_10px_rgba(217,119,6,0.3)]";
                }

                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-cyber-border hover:bg-black hover:bg-opacity-20 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <div className={`w-6 h-6 rounded flex items-center justify-center border font-cyber text-[10px] font-bold ${rankColor}`}>
                        #{rank}
                      </div>

                      {/* Address representation */}
                      <div className="min-w-0">
                        <div className="flex items-center">
                          <span className="font-mono text-xs font-bold text-white tracking-widest group-hover:text-neon-blue transition-colors">
                            {item.address}
                          </span>
                          {item.isPlayer && (
                            <span className="ml-2 text-[8px] bg-neon-green text-black px-1.5 py-0.5 rounded font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-cyber-dim font-medium tracking-wider">
                          {new Date(item.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Score section */}
                    <div className="font-cyber font-bold text-sm tracking-widest">
                      <span className="text-white group-hover:text-neon-blue transition-colors">
                        {item.score}
                      </span>
                      <span className="text-[8px] text-cyber-dim ml-1">PTS</span>
                    </div>
                  </div>
                );
              })
          : historyScores.map((item, index) => {
              const rank = index + 1;
              let rankColor = "text-cyber-dim border-cyber-border";

              return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-cyber-border hover:bg-black hover:bg-opacity-20 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <div className={`w-6 h-6 rounded flex items-center justify-center border font-cyber text-[10px] font-bold ${rankColor}`}>
                        #{rank}
                      </div>

                      {/* Address representation */}
                      <div className="min-w-0">
                        <div className="flex items-center">
                          <span className="font-mono text-xs font-bold text-white tracking-widest group-hover:text-neon-blue transition-colors">
                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + " " + new Date(item.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score section */}
                    <div className="font-cyber font-bold text-sm tracking-widest">
                      <span className="text-white group-hover:text-neon-blue transition-colors">
                        {item.score}
                      </span>
                      <span className="text-[8px] text-cyber-dim ml-1">PTS</span>
                    </div>
                  </div>
              );
          })
        }

        {(activeTab === "GLOBAL" ? leaderboard : historyScores).length === 0 && (
          <div className="text-center py-8 font-cyber text-xs text-cyber-dim tracking-wider uppercase">
            {activeTab === "GLOBAL" ? "NO SCORERS YET" : "NO HISTORY FOUND"}
          </div>
        )}
      </div>

      {/* Global terminal footprint */}
      <div className="mt-4 pt-3 border-t border-cyber-border flex items-center justify-between text-[8px] font-cyber text-cyber-dim tracking-widest uppercase">
        <span>SYSTEM: ONLINE</span>
        <span className="animate-pulse">BLOCK ID: #52899</span>
      </div>
    </div>
  );
};
