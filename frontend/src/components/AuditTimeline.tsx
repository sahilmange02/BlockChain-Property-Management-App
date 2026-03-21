/*
 * AUDIT TIMELINE
 * ===============
 * BLOCKCHAIN EXPLAINED:
 * Each event in the timeline came from the blockchain — PropertyRegistered,
 * PropertyVerified, OwnershipTransferred. The txHash links to the block explorer
 * where anyone can verify the transaction.
 */
import { FileCheck, Shield, ArrowRightLeft } from "lucide-react";
import type { AuditLog } from "@/types";
import { BlockchainAddressBadge } from "./BlockchainAddressBadge";

const blockExplorerUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || "https://sepolia.etherscan.io";
const isLocal = import.meta.env.VITE_CHAIN_ID === "31337";

const eventIcons: Record<string, React.ReactNode> = {
  PropertyRegistered: <FileCheck size={18} className="text-emerald-400" />,
  PropertyVerified: <Shield size={18} className="text-emerald-400" />,
  OwnershipTransferred: <ArrowRightLeft size={18} className="text-blue-400" />,
};

interface Props {
  events: AuditLog[];
}

export function AuditTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">No audit events recorded yet.</p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const Icon = eventIcons[event.eventType] || <FileCheck size={18} />;
        const txLink = isLocal ? "#" : `${blockExplorerUrl}/tx/${event.txHash}`;

        return (
          <div key={event._id} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-emerald-500/20">
                {Icon}
              </div>
              {i < events.length - 1 && (
                <div className="w-px flex-1 bg-gray-700 mt-2 min-h-[24px]" />
              )}
            </div>
            <div className="flex-1 pt-1">
              <p className="font-medium text-white">{event.eventType.replace(/([A-Z])/g, " $1").trim()}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date(event.timestamp).toLocaleString()}
              </p>
              {(event.fromAddress || event.toAddress) && (
                <div className="flex flex-wrap gap-2 mt-2 text-sm">
                  {event.fromAddress && (
                    <span className="text-gray-400">
                      From: <BlockchainAddressBadge address={event.fromAddress} showLink={false} />
                    </span>
                  )}
                  {event.toAddress && (
                    <span className="text-gray-400">
                      To: <BlockchainAddressBadge address={event.toAddress} showLink={false} />
                    </span>
                  )}
                </div>
              )}
              {event.txHash && (
                <a
                  href={txLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-accent hover:underline font-mono"
                >
                  {event.txHash.slice(0, 10)}...{event.txHash.slice(-8)}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
