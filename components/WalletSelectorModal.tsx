import React from "react";
import { X, ChevronDown } from "lucide-react";

interface WalletOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: string;
  isRecommended?: boolean;
}

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectWallet: (walletId: string) => void;
  hasPetraExtension: boolean;
  hasMartianExtension: boolean;
  hasPontemExtension: boolean;
  hasOkxExtension: boolean;
  hasNightlyExtension: boolean;
  hasRabbyExtension: boolean;
}

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isOpen,
  onClose,
  onConnectWallet,
  hasPetraExtension,
  hasMartianExtension,
  hasPontemExtension,
  hasOkxExtension,
  hasNightlyExtension,
  hasRabbyExtension,
}) => {
  if (!isOpen) return null;

  const handleWalletClick = (walletId: string) => {
    if (walletId === "petra") {
      if (hasPetraExtension) onConnectWallet(walletId);
      else window.open("https://petra.app/", "_blank");
      onClose();
    } else if (walletId === "martian") {
      if (hasMartianExtension) onConnectWallet(walletId);
      else window.open("https://martianwallet.xyz/", "_blank");
      onClose();
    } else if (walletId === "pontem") {
      if (hasPontemExtension) onConnectWallet(walletId);
      else window.open("https://pontem.network/", "_blank");
      onClose();
    } else if (walletId === "okx") {
      if (hasOkxExtension) onConnectWallet(walletId);
      else window.open("https://www.okx.com/web3", "_blank");
      onClose();
    } else if (walletId === "nightly") {
      if (hasNightlyExtension) onConnectWallet(walletId);
      else window.open("https://nightly.app/", "_blank");
      onClose();
    } else if (walletId === "rabby") {
      if (hasRabbyExtension) onConnectWallet(walletId);
      else window.open("https://rabby.io/", "_blank");
      onClose();
    } else {
      // For completely unsupported wallets in this dApp
      alert(`${walletId} connection is not supported on Shelby Testnet yet. Please use an Aptos-compatible wallet.`);
    }
  };

  const getStatus = (id: string) => {
    if (id === "petra") return hasPetraExtension ? "Ready to connect" : "Not installed";
    if (id === "martian") return hasMartianExtension ? "Ready to connect" : "Not installed";
    if (id === "pontem") return hasPontemExtension ? "Ready to connect" : "Not installed";
    if (id === "okx") return hasOkxExtension ? "Ready to connect" : "Not installed";
    if (id === "nightly") return hasNightlyExtension ? "Ready to connect" : "Not installed";
    if (id === "rabby") return hasRabbyExtension ? "Ready to connect" : "Not installed";
    return "Not connected";
  };

  const wallets: WalletOption[] = [
    {
      id: "petra",
      name: "Petra Wallet",
      status: getStatus("petra"),
      isRecommended: true,
      icon: (
        <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
          P
        </div>
      ),
    },
    {
      id: "martian",
      name: "Martian",
      status: getStatus("martian"),
      icon: (
        <div className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
          M
        </div>
      ),
    },
    {
      id: "pontem",
      name: "Pontem",
      status: getStatus("pontem"),
      icon: (
        <div className="w-8 h-8 rounded-md bg-pink-500 flex items-center justify-center text-white font-bold text-lg">
          P
        </div>
      ),
    },
    {
      id: "okx",
      name: "OKX Wallet",
      status: getStatus("okx"),
      icon: (
        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-white font-bold text-lg">
          O
        </div>
      ),
    },
    {
      id: "nightly",
      name: "Nightly Wallet",
      status: getStatus("nightly"),
      icon: (
        <div className="w-8 h-8 rounded-md bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
          N
        </div>
      ),
    },
    {
      id: "rabby",
      name: "Rabby Wallet",
      status: getStatus("rabby"),
      icon: (
        <div className="w-8 h-8 rounded-md bg-blue-400 flex items-center justify-center text-white font-bold text-lg">
          R
        </div>
      ),
    },
    {
      id: "solana",
      name: "Solana",
      status: "Not connected",
      icon: (
        <div className="w-8 h-8 rounded-md bg-green-500 flex items-center justify-center text-white font-bold text-lg">
          S
        </div>
      ),
    },
    {
      id: "bitcoin",
      name: "Bitcoin",
      status: "Not connected",
      icon: (
        <div className="w-8 h-8 rounded-md bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
          ₿
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#1E1F2A] rounded-3xl shadow-2xl border border-gray-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 pb-2 text-center relative flex-shrink-0">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white mb-2 font-sans tracking-wide">
            Connect wallets
          </h2>
          <p className="text-sm text-gray-400 font-sans">
            Choose your preferred wallet to access Shelby Testnet.
          </p>
        </div>

        {/* Scrollable Wallet List */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-grow space-y-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleWalletClick(wallet.id)}
              className="w-full bg-[#252632] hover:bg-[#2C2D3A] border border-gray-700 hover:border-gray-500 transition-all rounded-2xl p-4 flex items-center group text-left"
            >
              {/* Fake Checkbox Space */}
              <div className="w-5 h-5 rounded border border-gray-600 mr-4 group-hover:border-gray-400 transition-colors flex-shrink-0" />
              
              {/* Icon */}
              <div className="mr-4 flex-shrink-0">
                {wallet.icon}
              </div>

              {/* Name and Status */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-base truncate">
                    {wallet.name}
                  </span>
                  {wallet.isRecommended && (
                    <span className="bg-purple-500/20 text-purple-400 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold whitespace-nowrap">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">
                  {wallet.status}
                </div>
              </div>

              {/* Connect Button */}
              <div className="flex items-center text-white text-sm font-medium hover:underline ml-4">
                {getStatus(wallet.id) === "Not installed" ? "Install" : "Connect"}
                {wallet.id === "evm" && <ChevronDown className="w-4 h-4 ml-1" />}
              </div>
            </button>
          ))}
        </div>
        
        {/* Bottom padding for scroll area */}
        <div className="h-4 flex-shrink-0" />
      </div>
    </div>
  );
};
