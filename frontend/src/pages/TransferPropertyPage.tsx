import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { authApi } from "../api/auth.api";
import { transferApi } from "../api/transfer.api";

export default function TransferPropertyPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contract, isConnected } = useWeb3();

  const propertyIdNum = Number(propertyId);

  const [newOwnerWallet, setNewOwnerWallet] = useState("");
  const [checking, setChecking] = useState(false);
  const [exists, setExists] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const walletLinked = !!user?.walletAddress;

  const canCheck = useMemo(() => /^0x[a-fA-F0-9]{40}$/.test(newOwnerWallet.trim()), [newOwnerWallet]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!canCheck) {
        setExists(null);
        return;
      }
      setChecking(true);
      try {
        const res = await authApi.checkWallet(newOwnerWallet.trim());
        if (!cancelled) setExists(res.exists);
      } catch {
        if (!cancelled) setExists(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [canCheck, newOwnerWallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletLinked) {
      toast.error("Please connect and link your wallet first.");
      return;
    }
    if (!Number.isFinite(propertyIdNum) || propertyIdNum <= 0) {
      toast.error("Invalid property id");
      return;
    }
    if (!isConnected || !contract) {
      toast.error("Wallet not connected or contract not loaded");
      return;
    }
    if (!canCheck) {
      toast.error("Enter a valid new owner wallet address");
      return;
    }

    setSubmitting(true);
    try {
      const tx = await contract.initiateTransfer(propertyIdNum, newOwnerWallet.trim());
      toast("Transaction submitted, waiting for confirmation...", { icon: "⏳" });
      const receipt = await tx.wait(1);

      await transferApi.initiate({
        propertyId: propertyIdNum,
        newOwnerWallet: newOwnerWallet.trim(),
        blockchainTxHash: receipt.transactionHash,
      });

      toast.success("Transfer initiated. Pending government approval.");
      navigate("/dashboard");
    } catch (err: any) {
      if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction rejected by user");
      } else {
        toast.error(err?.response?.data?.message || err?.message || "Transfer failed");
        console.error(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Transfer Property</h1>
      <p className="text-gray-400 mb-6">Property ID: {propertyId}</p>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">New Owner Wallet Address</label>
          <input
            value={newOwnerWallet}
            onChange={(e) => setNewOwnerWallet(e.target.value)}
            className="input-field"
            placeholder="0x..."
          />
          <div className="text-xs text-gray-400 mt-2">
            {checking ? "Checking wallet..." : exists === null ? "" : exists ? "This wallet is registered." : "This wallet is not registered."}
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
          {submitting ? <Loader size={16} className="animate-spin" /> : null}
          {submitting ? "Submitting..." : "Initiate Transfer"}
        </button>
      </form>
    </div>
  );
}

