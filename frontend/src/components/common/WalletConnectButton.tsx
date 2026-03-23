import { AlertTriangle, Loader, Wallet } from "lucide-react";
import { useWeb3 } from "../../context/Web3Context";

export default function WalletConnectButton() {
  const {
    account,
    isConnected,
    isCorrectNetwork,
    isConnecting,
    connect,
    disconnect,
    switchNetwork,
  } = useWeb3();

  if (isConnecting) {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg">
        <Loader size={16} className="animate-spin" />
        Connecting...
      </button>
    );
  }

  if (isConnected && !isCorrectNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium"
      >
        <AlertTriangle size={16} />
        Switch Network
      </button>
    );
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-800 rounded-lg text-green-300 text-sm font-mono">
          <span className="block h-2 w-2 rounded-full bg-green-400" />
          {account.slice(0, 6)}...{account.slice(-4)}
        </div>
        <button
          onClick={disconnect}
          className="px-3 py-2 text-xs text-gray-400 hover:text-white border border-gray-600 rounded-lg"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
    >
      <Wallet size={16} />
      Connect MetaMask
    </button>
  );
}

