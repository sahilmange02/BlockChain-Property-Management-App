/*
 * OWNERSHIP TRANSFER PAGE
 * ========================
 * BLOCKCHAIN EXPLAINED:
 * User calls contract.initiateTransfer(propertyId, newOwnerAddress).
 * This creates a transfer request on-chain. Government must approve
 * via contract.approveTransfer(transferId). Our backend syncs status.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useWeb3 } from "@/context/Web3Context";
import { TransactionStatus } from "@/components/TransactionStatus";
import toast from "react-hot-toast";

export function OwnershipTransferPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { contract } = useWeb3();
  const [newOwner, setNewOwner] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");

  const { data: property } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data } = await api.get<{ property: Record<string, unknown> }>(`/properties/${propertyId}`);
      return data.property;
    },
    enabled: !!propertyId,
  });

  const { data: walletCheck } = useQuery({
    queryKey: ["check-wallet", newOwner],
    queryFn: async () => {
      const { data } = await api.get<{ exists: boolean; user?: { name: string; email: string } }>(`/auth/check-wallet/${newOwner}`);
      return data;
    },
    enabled: /^0x[a-fA-F0-9]{40}$/.test(newOwner),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !propertyId || !newOwner) return;

    try {
      setTxStatus("pending");
      const tx = await contract.initiateTransfer(parseInt(propertyId, 10), newOwner);
      setTxHash(tx.hash);

      const receipt = await tx.wait(1);
      setTxStatus(receipt?.status === 1 ? "confirmed" : "failed");

      if (receipt?.status === 1) {
        await api.post("/transfers/initiate", {
          propertyId: parseInt(propertyId, 10),
          newOwnerWallet: newOwner,
          blockchainTxHash: receipt.hash,
        });
        toast.success("Transfer request submitted. Awaiting government approval.");
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      setTxStatus("failed");
      toast.error((err as Error).message);
    }
  };

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(newOwner);

  return (
    <div className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Transfer Ownership</h1>
      <p className="text-gray-400 mb-6">
        Property #{propertyId} — Initiate transfer to new owner
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">New Owner Wallet Address</label>
          <input
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white font-mono"
          />
          {walletCheck?.exists && (
            <p className="mt-2 text-sm text-emerald-400">
              ✓ Wallet found in system: {walletCheck.user?.name} ({walletCheck.user?.email})
            </p>
          )}
        </div>

        {txStatus !== "idle" && txStatus !== "confirmed" && (
          <TransactionStatus
            txHash={txHash}
            status={txStatus === "idle" ? "pending" : txStatus}
          />
        )}

        <button
          type="submit"
          disabled={!isValidAddress || !contract || txStatus === "pending"}
          className="w-full py-3 bg-accent text-primary font-semibold rounded-lg disabled:opacity-50"
        >
          {txStatus === "pending" ? "Confirming..." : "Confirm Transfer on Blockchain"}
        </button>
      </form>
    </div>
  );
}
