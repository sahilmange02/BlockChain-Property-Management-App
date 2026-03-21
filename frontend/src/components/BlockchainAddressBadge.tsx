/*
 * BLOCKCHAIN ADDRESS BADGE
 * =========================
 * Displays a truncated Ethereum address with copy functionality.
 * Links to block explorer (Etherscan for Sepolia, none for local Hardhat).
 */
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

const blockExplorerUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || "https://sepolia.etherscan.io";
const isLocal = import.meta.env.VITE_CHAIN_ID === "31337";

interface Props {
  address: string;
  showCopy?: boolean;
  showLink?: boolean;
}

export function BlockchainAddressBadge({
  address,
  showCopy = true,
  showLink = !isLocal,
}: Props) {
  const [copied, setCopied] = useState(false);
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const linkUrl = address.startsWith("0x") ? `${blockExplorerUrl}/address/${address}` : null;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm">
      <span className="text-gray-300">{truncated}</span>
      {showCopy && (
        <button
          onClick={copy}
          className="p-1 text-gray-500 hover:text-white rounded transition-colors"
          title="Copy address"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
      {showLink && linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-gray-500 hover:text-accent rounded transition-colors"
          title="View on Explorer"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </span>
  );
}
