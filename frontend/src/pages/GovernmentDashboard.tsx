import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWeb3 } from "../context/Web3Context";
import { adminApi } from "../api/admin.api";
import { transferApi } from "../api/transfer.api";
import { kycApi } from "../api/kyc.api";
import type { Property, Transfer } from "../types";
import StatusBadge from "../components/common/StatusBadge";
import toast from "react-hot-toast";
import { CheckCircle, Loader, RefreshCw, XCircle } from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function GovernmentDashboard() {
  const { contract } = useWeb3();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"properties" | "transfers" | "kyc">("properties");
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [kycRejectModal, setKycRejectModal] = useState<{ userId: string; userName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState<number | string | null>(null);

  const pendingProps = useQuery({
    queryKey: ["admin", "pending-properties"],
    queryFn: adminApi.getPendingProperties,
    refetchInterval: 15000,
  });

  const pendingTransfers = useQuery({
    queryKey: ["admin", "pending-transfers"],
    queryFn: adminApi.getPendingTransfers,
    refetchInterval: 15000,
  });

  const pendingKyc = useQuery({
    queryKey: ["kyc", "pending-users"],
    queryFn: kycApi.getPendingKycUsers,
    refetchInterval: 15000,
  });

  const handleVerify = async (property: Property) => {
    setProcessingId(property.blockchainPropertyId);
    try {
      let txHash: string | undefined;

      if (contract) {
        try {
          toast("Waiting for MetaMask approval...", { icon: "⏳" });
          const tx = await contract.verifyProperty(property.blockchainPropertyId);
          toast("Confirming on blockchain...", { icon: "⛓️" });
          const receipt = await tx.wait(1);
          txHash = receipt.hash ?? receipt.transactionHash;
        } catch (err: any) {
          if (err?.code === 4001) {
            toast.error("Rejected by user");
            setProcessingId(null);
            return;
          }
          console.warn("Blockchain verify failed; continuing DB update:", err?.message);
        }
      }

      await adminApi.verifyProperty(property.blockchainPropertyId, txHash);
      toast.success(`Property #${property.blockchainPropertyId} verified!`);
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-properties"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Verification failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    const id = rejectModal.id;
    setProcessingId(id);
    try {
      await adminApi.rejectProperty(id, rejectReason);
      toast.success(`Property #${id} rejected`);
      setRejectModal(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-properties"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveTransfer = async (transfer: Transfer) => {
    setProcessingId(transfer._id);
    try {
      let txHash = "0x0";

      if (contract) {
        try {
          const pendingTransfer = await contract.getPendingTransfer(transfer.propertyId);
          const blockchainTransferId = pendingTransfer.transferId;
          toast("Waiting for MetaMask approval...", { icon: "⏳" });
          const tx = await contract.approveTransfer(blockchainTransferId);
          const receipt = await tx.wait(1);
          txHash = receipt.hash ?? receipt.transactionHash;
        } catch (err: any) {
          if (err?.code === 4001) {
            toast.error("Rejected by user");
            setProcessingId(null);
            return;
          }
          console.warn("Blockchain approve failed; continuing DB update:", err?.message);
        }
      }

      await transferApi.confirm(transfer._id, txHash);
      toast.success(`Transfer for Property #${transfer.propertyId} approved!`);
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-transfers"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Approval failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveKyc = async (userId: string) => {
    setProcessingId(userId);
    try {
      await kycApi.approveKyc(userId);
      toast.success("KYC approved!");
      queryClient.invalidateQueries({ queryKey: ["kyc", "pending-users"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Approval failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectKyc = async () => {
    if (!kycRejectModal || !rejectReason.trim()) return;
    const { userId } = kycRejectModal;
    setProcessingId(userId);
    try {
      await kycApi.rejectKyc(userId, rejectReason);
      toast.success("KYC rejected");
      setKycRejectModal(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["kyc", "pending-users"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Government Dashboard</h1>
          <p className="text-gray-400 mt-1">Review and approve property registrations and transfers</p>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin"] });
            toast.success("Refreshed");
          }}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab("properties")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "properties" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Pending Properties ({pendingProps.data?.properties?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "transfers" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Pending Transfers ({pendingTransfers.data?.transfers?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("kyc")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "kyc" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Pending KYC ({pendingKyc.data?.count || 0})
        </button>
      </div>

      {activeTab === "properties" ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {pendingProps.isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <LoadingSpinner label="Loading..." />
            </div>
          ) : pendingProps.data?.properties?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending properties</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-3">Survey No.</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Owner Wallet</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {pendingProps.data!.properties.map((prop) => (
                  <tr key={prop.blockchainPropertyId} className="text-gray-300 hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono">{prop.surveyNumber}</td>
                    <td className="px-4 py-3">
                      {prop.location.city}, {prop.location.state}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{prop.ownerWallet.slice(0, 10)}...</td>
                    <td className="px-4 py-3">
                      <a href={prop.ipfsGatewayUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline text-xs">
                        View ↗
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleVerify(prop)}
                          disabled={processingId === prop.blockchainPropertyId}
                          className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded disabled:opacity-50"
                        >
                          {processingId === prop.blockchainPropertyId ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                          Verify
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: prop.blockchainPropertyId })}
                          className="flex items-center gap-1 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                      <div className="mt-2">
                        <StatusBadge status={prop.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {activeTab === "transfers" ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {pendingTransfers.isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <LoadingSpinner label="Loading..." />
            </div>
          ) : pendingTransfers.data?.transfers?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending transfers</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-3">Property ID</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Initiated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {pendingTransfers.data!.transfers.map((t) => (
                  <tr key={t._id} className="text-gray-300 hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono">#{t.propertyId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.fromOwnerWallet.slice(0, 10)}...</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.toOwnerWallet.slice(0, 10)}...</td>
                    <td className="px-4 py-3 text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleApproveTransfer(t)}
                        disabled={processingId === t._id}
                        className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded disabled:opacity-50"
                      >
                        {processingId === t._id ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {activeTab === "kyc" ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {pendingKyc.isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <LoadingSpinner label="Loading..." />
            </div>
          ) : pendingKyc.data?.users?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending KYC verifications</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Aadhaar (Last 4)</th>
                  <th className="px-4 py-3">PAN (Last 4)</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {pendingKyc.data!.users.map((user) => (
                  <tr key={user._id} className="text-gray-300 hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-xs">{user.email}</td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3 font-mono text-xs">****{user.last4Aadhaar}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{user.last4Pan}***</td>
                    <td className="px-4 py-3 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleApproveKyc(user._id)}
                          disabled={processingId === user._id}
                          className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded disabled:opacity-50"
                        >
                          {processingId === user._id ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                          Approve
                        </button>
                        <button
                          onClick={() => setKycRejectModal({ userId: user._id, userName: user.name })}
                          className="flex items-center gap-1 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {rejectModal ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">Reject Property #{rejectModal.id}</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full input-field"
              rows={4}
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {kycRejectModal ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">Reject KYC - {kycRejectModal.userName}</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full input-field"
              rows={4}
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setKycRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectKyc}
                disabled={!rejectReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

