"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const aptos = new Aptos(new AptosConfig({ network: Network.CUSTOM, fullnode: "https://api.shelbynet.shelby.xyz/v1" }));

export interface AptosWalletContextType {
  isConnected: boolean;
  accountAddress: string | null;
  networkName: string | null;
  balance: number;
  points: number;
  userHighScore: number;
  isNetworkWrong: boolean;
  hasPetraExtension: boolean;
  hasMartianExtension: boolean;
  hasPontemExtension: boolean;
  hasOkxExtension: boolean;
  hasNightlyExtension: boolean;
  hasRabbyExtension: boolean;
  connectWallet: (walletId: string) => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  signAndSubmitTransaction: (payload: any) => Promise<{ hash: string }>;
  mintFaucetTokens: () => Promise<void>;
  dailyCheckInDate: string | null;
  performDailyCheckIn: () => Promise<void>;
}

const AptosWalletContext = createContext<AptosWalletContextType | undefined>(undefined);

const InnerWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, connected, network, changeNetwork, connect, disconnect, signAndSubmitTransaction: adapterSignAndSubmitTransaction, wallets } = useWallet();

  const [balance, setBalance] = useState(0.0);
  const [points, setPoints] = useState(0);
  const [userHighScore, setUserHighScore] = useState(0);
  const [isNetworkWrong, setIsNetworkWrong] = useState(false);
  const [dailyCheckInDate, setDailyCheckInDate] = useState<string | null>(null);

  const accountAddress = account?.address?.toString() || null;
  const networkNameRaw = typeof network === "string" ? network : (network?.name || "UNKNOWN");
  const networkName = networkNameRaw.toLowerCase() === "custom" ? "Shelbynet Testnet" : networkNameRaw;
  const isConnected = connected;

  // Real-time Network validation
  useEffect(() => {
    if (!isConnected) {
      setIsNetworkWrong(false);
      return;
    }
    console.log("[WalletAdapter] Current network state:", networkName);
    const networkStr = String(networkName);
    const isCorrect = 
      networkStr === "Shelbynet Testnet" || 
      networkStr === "Shelbynet" || 
      networkStr.toLowerCase().includes("testnet") || 
      networkStr === "UNKNOWN";
      
    setIsNetworkWrong(!isCorrect);
  }, [networkName, isConnected]);

  // Real-time Balance Fetching from Shelbynet
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchRealBalance = async () => {
      if (!accountAddress) return;
      try {
        const amount = await aptos.getAccountCoinAmount({
          accountAddress,
          coinType: "0x1::aptos_coin::AptosCoin"
        });
        
        // Convert to display decimals (8 decimals)
        setBalance(Number(amount) / 100000000);
      } catch (e) {
        console.error("Error fetching balance:", e);
        setBalance(0);
      }

      // Fetch on-chain PlayerStats to sync Daily Check-in cooldown and points
      try {
        const res = await fetch(`https://api.shelbynet.shelby.xyz/v1/accounts/${accountAddress}/resources`);
        if (res.ok) {
          const resources = await res.json();
          const statsResource = resources.find((r: any) => r.type === "0x75ae89e208f02fc681cc308f9cd505242a22a805e09ba21ca15732e86df0169d::snake_arcade::PlayerStats");
          
          if (statsResource && statsResource.data) {
            const lastCheckInSecs = parseInt(statsResource.data.last_check_in);
            if (lastCheckInSecs > 0) {
              setDailyCheckInDate(new Date(lastCheckInSecs * 1000).toISOString());
            }
            setPoints(parseInt(statsResource.data.bonus_points) || 0);
            setUserHighScore(parseInt(statsResource.data.high_score) || 0);
          }
        }
      } catch (e) {
        console.error("Error fetching player stats:", e);
      }
    };

    if (isConnected && accountAddress) {
      fetchRealBalance(); // Initial fetch
      interval = setInterval(fetchRealBalance, 10000); // Sync every 10 seconds
    } else {
      setBalance(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, accountAddress]);

  // Connect using official adapter
  const connectWallet = async (walletId: string) => {
    let adapterName = "";
    if (walletId === "petra") adapterName = "Petra";
    if (walletId === "martian") adapterName = "Martian";
    if (walletId === "pontem") adapterName = "Pontem Wallet";
    if (walletId === "okx") adapterName = "OKX Wallet";
    if (walletId === "nightly") adapterName = "Nightly";
    if (walletId === "rabby") adapterName = "Rabby Wallet";

    try {
      console.log(`[WalletAdapter] Connecting to ${adapterName}...`);
      await connect(adapterName as any);
    } catch (e) {
      console.error(`[WalletAdapter] Connection error for ${adapterName}:`, e);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
    } catch (e) {
      console.error("Disconnect error", e);
    }
  };

  const switchNetwork = async () => {
    try {
      if (changeNetwork) {
        const targetNetworks = [Network.TESTNET, Network.CUSTOM, "Shelbynet Testnet", "Shelbynet"];
        for (const net of targetNetworks) {
          try {
            await changeNetwork(net as any);
            return; // Successful!
          } catch (err) {
            console.log(`[Adapter] Failed to switch to ${net}`);
          }
        }
      }

      // Try direct window provider calls as a fallback (Petra/Martian specific)
      if (typeof window !== "undefined") {
        const anyWindow = window as any;
        if (anyWindow.aptos && typeof anyWindow.aptos.changeNetwork === "function") {
          try {
            await anyWindow.aptos.changeNetwork("Shelbynet Testnet");
            return;
          } catch (e) { console.log("[Window] Failed aptos.changeNetwork"); }
        }
      }

      alert("Wallet rejected the switch request or your extension doesn't support custom network auto-switching. Please open the wallet and switch to Shelbynet Testnet manually.");
    } catch (e) {
      console.error("Network switching failed", e);
      alert("Please open your wallet extension and switch to Shelbynet Testnet manually.");
    }
  };

  // Helper to check if a wallet extension is ready/installed
  const checkExtension = (nameStr: string) => {
    const w = wallets?.find(w => w.name.toLowerCase().includes(nameStr.toLowerCase()));
    const stateStr = String(w?.readyState);
    return stateStr === "Installed" || stateStr === "Loadable";
  };

  const hasPetraExtension = checkExtension("petra");
  const hasMartianExtension = checkExtension("martian");
  const hasPontemExtension = checkExtension("pontem");
  const hasOkxExtension = checkExtension("okx");
  const hasNightlyExtension = checkExtension("nightly");
  const hasRabbyExtension = checkExtension("rabby");

  // Faucet minting
  const mintFaucetTokens = async () => {
    if (!isConnected) return;
    try {
      await adapterSignAndSubmitTransaction({
        data: {
          function: "0x1::faucet::request_tokens",
          typeArguments: [],
          functionArguments: ["10000000"]
        }
      });
      setBalance(prev => parseFloat((prev + 10.0).toFixed(4)));
    } catch (e) {
      console.error("Faucet Transaction Rejected", e);
    }
  };

  // Sign and Submit general transaction payload
  const signAndSubmitTransaction = (payload: any): Promise<{ hash: string }> => {
    if (isNetworkWrong) {
      return Promise.reject(new Error("Wrong network! Connect to Shelbynet Testnet."));
    }
    if (!isConnected) {
      return Promise.reject(new Error("Wallet not connected"));
    }

    return new Promise(async (resolve, reject) => {
      try {
        let formattedPayload = payload;
        if (payload.type === "entry_function_payload") {
           formattedPayload = {
             data: {
               function: payload.function,
               typeArguments: payload.type_arguments || [],
               functionArguments: payload.arguments || []
             }
           };
        }

        const response = await adapterSignAndSubmitTransaction(formattedPayload);
        
        // Deduct cost locally
        if (payload.arguments && payload.arguments[1]) {
          // Local optimistic update will be overwritten by real-time fetch shortly
          const amount = parseFloat(payload.arguments[1]) / 100000000;
          if (!isNaN(amount)) {
            setBalance(prev => Math.max(0, parseFloat((prev - amount).toFixed(4))));
          }
        }
        resolve({ hash: response.hash });
      } catch (e) {
        reject(e);
      }
    });
  };

  // Daily Check-In Process
  const performDailyCheckIn = async () => {
    if (!isConnected || isNetworkWrong) return;

    if (dailyCheckInDate) {
      const lastCheck = new Date(dailyCheckInDate).getTime();
      const now = new Date().getTime();
      const diffHrs = (now - lastCheck) / (1000 * 60 * 60);
      if (diffHrs < 24) {
        throw new Error("Check-in is on cooldown. Try again in 24 hours.");
      }
    }

    const payload = {
      type: "entry_function_payload",
      function: "0x75ae89e208f02fc681cc308f9cd505242a22a805e09ba21ca15732e86df0169d::snake_arcade::daily_check_in",
      type_arguments: ["0x1::aptos_coin::AptosCoin"],
      arguments: []
    };

    try {
      await signAndSubmitTransaction(payload);
    } catch (e: any) {
      // Catch specific function not found errors so user is aware the contract is missing
      if (e?.message?.includes("function not found") || e?.message?.includes("module not found") || e?.message?.includes("LINKER_ERROR")) {
        alert("Daily Check-In Failed: The Smart Contract '0x1::shelby_arcade' was not found on Shelbynet. Please deploy your contract first!");
      } else {
        throw e;
      }
      return;
    }

    const nowStr = new Date().toISOString();
    // Optimistic UI update, real fetch will overwrite this in a few seconds
    setPoints(points + 10);
    setDailyCheckInDate(nowStr);
  };

  return (
    <AptosWalletContext.Provider
      value={{
        isConnected,
        accountAddress,
        networkName,
        balance,
        points,
        userHighScore,
        hasPetraExtension,
        hasMartianExtension,
        hasPontemExtension,
        hasOkxExtension,
        hasNightlyExtension,
        hasRabbyExtension,
        isNetworkWrong,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        signAndSubmitTransaction,
        mintFaucetTokens,
        dailyCheckInDate,
        performDailyCheckIn
      }}
    >
      {children}
    </AptosWalletContext.Provider>
  );
};

export const AptosWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      optInWallets={[
        "Petra", 
        "Martian", 
        "Pontem Wallet", 
        "Nightly", 
        "OKX Wallet", 
        "Rabby Wallet"
      ]}
    >
      <InnerWalletProvider>
        {children}
      </InnerWalletProvider>
    </AptosWalletAdapterProvider>
  );
};

export const useAptosWallet = () => {
  const context = useContext(AptosWalletContext);
  if (!context) {
    throw new Error("useAptosWallet must be used within an AptosWalletProvider");
  }
  return context;
};
