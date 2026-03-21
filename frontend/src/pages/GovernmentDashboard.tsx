/*
 * GOVERNMENT DASHBOARD
 * =====================
 * BLOCKCHAIN EXPLAINED:
 * "Verify" calls contract.verifyProperty(propertyId) — government signs the tx.
 * "Reject" calls contract.rejectProperty(propertyId, reason).
 * "Approve Transfer" calls contract.approveTransfer(transferId).
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useWeb3 } from "@/context/Web3Context";
import { IPFSDocumentViewer } from "@/components/IPFSDocumentViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { Check, X } from "lucide-react";
import toast from "react-hot-toast";

export function GovernmentDashboard() {
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const { contract } = useWeb3();
  const queryClient = useQueryClient();

  const { data: pending } = useQuery({
    queryKey: ["pending-properties"],
    queryFn: async () => {
      const { data } = await api.get<{ properties: unknown[] }>("/admin/pending-properties");
      return data.properties;
    },
    refetchInterval: 10000,
  });

  const { data: pendingTransfers } = useQuery({
    queryKey: ["pending-transfers"],
    queryFn: async () => {
      const { data } = await api.get<{ transfers: unknown[] }>("/admin/pending-transfers");
      return data.transfers;
    },
    refetchInterval: 10000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data } = await api.get<{
        totalProperties: number;
        pendingVerifications: number;
        totalTransfers: number;
        propertiesByType: Record<string, number>;
        propertiesByStatus: Record<string, number>;
        recentActivity: unknown[];
      }>("/admin/analytics");
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ blockchainPropertyId, surveyNumber }: { blockchainPropertyId: number; surveyNumber: string }) => {
      const tx = await contract!.verifyProperty(blockchainPropertyId);
      const receipt = await tx.wait();
      await api.post(`/admin/verify-property/${blockchainPropertyId}`, {
        blockchainTxHash: receipt!.hash,
      });
      return { surveyNumber };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-properties"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success(`Property ${variables.surveyNumber} verified on blockchain ✓`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(`/admin/reject-property/${id}`, { reason });
    },
    onSuccess: () => {
      setRejectTarget(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["pending-properties"] });
      toast.success("Property rejected");
    },
  });

  const approveTransferMutation = useMutation({
    mutationFn: async ({ mongoId, propertyId }: { mongoId: string; propertyId: number }) => {
      const pending = await contract!.getPendingTransfer(propertyId);
      const blockchainTransferId = Number(pending.transferId);
      const tx = await contract!.approveTransfer(blockchainTransferId);
      const receipt = await tx.wait();
      await api.post(`/transfers/confirm/${mongoId}`, {
        blockchainTxHash: receipt.hash,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-transfers"] });
      toast.success("Transfer approved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [activeTab, setActiveTab] = useState(0);

  const typeData = analytics?.propertiesByType
    ? Object.entries(analytics.propertiesByType).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 bg-primary p-4">
        <h1 className="text-xl font-bold text-white">Government Dashboard</h1>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-2 mb-6">
          {["Pending Verifications", "Pending Transfers", "Analytics"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-lg ${activeTab === i ? "bg-accent text-primary" : "bg-surface text-gray-400"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-800">
                  <th className="pb-3">Survey No</th>
                  <th className="pb-3">Owner</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Area</th>
                  <th className="pb-3">Document</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(pending ?? []).map((p: unknown) => {
                  const row = p as { blockchainPropertyId: number; surveyNumber: string; ownerWallet: string; location: { city?: string }; propertyType: string; area: number; ipfsCid: string };
                  return (
                  <tr key={row.blockchainPropertyId} className="border-b border-gray-800">
                    <td className="py-4 font-mono text-accent">{row.surveyNumber}</td>
                    <td className="py-4 font-mono text-sm">{row.ownerWallet?.slice(0, 10)}...</td>
                    <td className="py-4">{row.location?.city ?? "-"}</td>
                    <td className="py-4">{row.propertyType}</td>
                    <td className="py-4">{row.area} sq ft</td>
                    <td className="py-4">
                      <IPFSDocumentViewer cid={row.ipfsCid} label="View" />
                    </td>
                    <td className="py-4 flex gap-2">
                      <button
                        onClick={() => verifyMutation.mutate({ blockchainPropertyId: row.blockchainPropertyId, surveyNumber: row.surveyNumber })}
                        disabled={!contract}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded disabled:opacity-50"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => setRejectTarget(row.blockchainPropertyId)}
                        className="p-2 bg-red-600 hover:bg-red-500 rounded"
                      >
                        <X size={18} />
                      </button>
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 1 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-800">
                  <th className="pb-3">Property ID</th>
                  <th className="pb-3">From</th>
                  <th className="pb-3">To</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {(pendingTransfers ?? []).map((t: unknown) => {
                  const row = t as { _id: string; propertyId: number; fromOwnerWallet: string; toOwnerWallet: string };
                  return (
                  <tr key={row._id} className="border-b border-gray-800">
                    <td className="py-4">#{row.propertyId}</td>
                    <td className="py-4 font-mono text-sm">{row.fromOwnerWallet?.slice(0, 10)}...</td>
                    <td className="py-4 font-mono text-sm">{row.toOwnerWallet?.slice(0, 10)}...</td>
                    <td className="py-4">
                      <button
                        onClick={() => approveTransferMutation.mutate({ mongoId: row._id, propertyId: row.propertyId })}
                        disabled={!contract}
                        className="px-4 py-2 bg-accent text-primary font-medium rounded disabled:opacity-50"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 2 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-surface rounded-xl border border-gray-800">
              <h3 className="font-semibold text-white mb-4">Properties by Type</h3>
              <div className="space-y-2">
                {typeData.map((item, i) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <span className="text-gray-400">{item.name}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 bg-surface rounded-xl border border-gray-800">
              <h3 className="font-semibold text-white mb-4">KPIs</h3>
              <div className="space-y-2">
                <p className="text-gray-400">Total Properties: <span className="text-white">{analytics?.totalProperties ?? 0}</span></p>
                <p className="text-gray-400">Pending: <span className="text-amber-400">{analytics?.pendingVerifications ?? 0}</span></p>
                <p className="text-gray-400">Transfers: <span className="text-white">{analytics?.totalTransfers ?? 0}</span></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="font-semibold text-white mb-4">Reject Property #{rejectTarget}</h3>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason"
              className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg text-white mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="flex-1 py-2 bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectTarget, reason: rejectReason })}
                className="flex-1 py-2 bg-red-600 rounded-lg"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
