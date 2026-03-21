/*
 * TRANSACTION STATUS
 * ===================
 * BLOCKCHAIN EXPLAINED:
 * After a user signs a transaction in MetaMask, the tx is broadcast to the network.
 * "pending" = waiting for a miner to include it in a block
 * "confirmed" = included in a block, immutable
 * "failed" = reverted (e.g., ran out of gas, contract rejected)
 */
import { Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const blockExplorerUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || "https://sepolia.etherscan.io";
const isLocal = import.meta.env.VITE_CHAIN_ID === "31337";

interface Props {
  txHash?: string | null;
  status: "pending" | "confirmed" | "failed";
  message?: string;
}

export function TransactionStatus({ txHash, status, message }: Props) {
  const explorerLink = txHash
    ? isLocal
      ? `#`
      : `${blockExplorerUrl}/tx/${txHash}`
    : null;

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-surface border border-gray-800">
      {status === "pending" && (
        <>
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Transaction Pending</p>
            <p className="text-sm text-gray-400 mt-1">
              Transaction submitted to the blockchain. Waiting for a miner to include it in a block.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Local network: this takes &lt;1 second. Sepolia testnet: 12–30 seconds.
            </p>
          </div>
        </>
      )}
      {status === "confirmed" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 w-full"
        >
          <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-emerald-400">Transaction Confirmed</p>
            <p className="text-sm text-gray-400 mt-1">
              Your property is now permanently recorded on the blockchain. It cannot be changed or deleted by anyone.
            </p>
            {explorerLink && explorerLink !== "#" && (
              <a
                href={explorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline mt-2"
              >
                View on Explorer <ExternalLink size={12} />
              </a>
            )}
          </div>
        </motion.div>
      )}
      {status === "failed" && (
        <>
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-400">Transaction Failed</p>
            <p className="text-sm text-gray-400">{message || "An error occurred."}</p>
          </div>
        </>
      )}
    </div>
  );
}
