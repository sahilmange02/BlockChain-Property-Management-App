/*
 * CONTRACT EVENTS HOOK
 * =====================
 * BLOCKCHAIN EXPLAINED:
 * Smart contracts emit "events" when something happens (e.g., PropertyRegistered).
 * This hook subscribes to those events in real-time using ethers.js.
 * The events are broadcast by the blockchain — we listen and add them to our list.
 */
import { useState, useEffect } from "react";
import { useWeb3 } from "@/context/Web3Context";

export interface ContractEvent {
  type: string;
  propertyId: number;
  from?: string;
  to?: string;
  txHash?: string;
  blockNumber?: number;
  timestamp?: Date;
}

const MAX_EVENTS = 20;

export function useContractEvents() {
  const { contract } = useWeb3();
  const [events, setEvents] = useState<ContractEvent[]>([]);

  useEffect(() => {
    if (!contract) return;

    const handler = (type: string) => (...args: unknown[]) => {
      const last = args[args.length - 1] as { log?: { transactionHash?: string; blockNumber?: number } };
      const propId = typeof args[1] === "bigint" ? Number(args[1]) : typeof args[0] === "bigint" ? Number(args[0]) : 0;
      const from = typeof args[2] === "string" ? args[2] : typeof args[1] === "string" ? args[1] : undefined;
      const to = typeof args[3] === "string" ? args[3] : undefined;
      const ts = typeof args[4] === "bigint" ? new Date(Number(args[4]) * 1000) : undefined;

      setEvents((prev) => [
        {
          type,
          propertyId: propId,
          from,
          to,
          txHash: last?.log?.transactionHash,
          blockNumber: last?.log?.blockNumber,
          timestamp: ts,
        },
        ...prev.slice(0, MAX_EVENTS - 1),
      ]);
    };

    contract.on("PropertyRegistered", handler("PropertyRegistered"));
    contract.on("PropertyVerified", handler("PropertyVerified"));
    contract.on("OwnershipTransferred", handler("OwnershipTransferred"));

    return () => {
      contract.off("PropertyRegistered", handler("PropertyRegistered"));
      contract.off("PropertyVerified", handler("PropertyVerified"));
      contract.off("OwnershipTransferred", handler("OwnershipTransferred"));
    };
  }, [contract]);

  return events;
}
