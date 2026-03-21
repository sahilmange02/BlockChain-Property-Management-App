/*
 * WALLET CONNECT BUTTON
 * ======================
 * BLOCKCHAIN EXPLAINED:
 * This component triggers MetaMask connection when clicked.
 * If the user is on the wrong network (e.g., Mainnet instead of Hardhat),
 * we show "Switch to Hardhat" and call wallet_switchEthereumChain.
 */
import { useWeb3 } from "@/context/Web3Context";
import { Wallet, LogOut, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export function WalletConnectButton() {
  const { account, isConnected, isWrongNetwork, connect, disconnect, switchNetwork } = useWeb3();

  const hasMetaMask = typeof window !== "undefined" && !!(window as unknown as { ethereum?: unknown }).ethereum;

  if (!hasMetaMask) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
      >
        <ExternalLink size={18} />
        Install MetaMask
      </a>
    );
  }

  if (isWrongNetwork) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={switchNetwork}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
      >
        <Wallet size={18} />
        Switch to Hardhat
      </motion.button>
    );
  }

  if (isConnected && account) {
    const truncated = `${account.slice(0, 6)}...${account.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-emerald-400 px-3 py-1.5 bg-emerald-900/30 rounded-lg">
          {truncated}
        </span>
        <button
          onClick={disconnect}
          className="p-2 text-gray-400 hover:text-white hover:bg-surface rounded-lg transition-colors"
          title="Disconnect"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={connect}
      className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-emerald-500 text-primary font-semibold rounded-lg transition-colors"
    >
      <Wallet size={18} />
      Connect MetaMask
    </motion.button>
  );
}
