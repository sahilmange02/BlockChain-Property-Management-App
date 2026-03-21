/*
 * PROPERTY DETAIL PAGE
 * ====================
 * Shows property metadata (from backend) and on-chain data side-by-side
 * for verification. The blockchain is the source of truth for ownership.
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { IPFSDocumentViewer, IPFSCIDBadge } from "@/components/IPFSDocumentViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { BlockchainAddressBadge } from "@/components/BlockchainAddressBadge";
import { AuditTimeline } from "@/components/AuditTimeline";
import { ArrowRight } from "lucide-react";
import type { AuditLog } from "@/types";

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const propertyId = id ? parseInt(id, 10) : null;

  const { data, isLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data } = await api.get<{
        property: Record<string, unknown>;
        onChain?: Record<string, unknown>;
        audit?: AuditLog[];
      }>(`/properties/${propertyId}`);
      return data;
    },
    enabled: !!propertyId,
  });

  const property = data?.property;
  const onChain = data?.onChain;
  const auditData = data?.audit ?? [];
  const isOwner = !!(user?.walletAddress && property?.ownerWallet &&
    String(property.ownerWallet).toLowerCase() === user.walletAddress.toLowerCase());

  if (isLoading || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  const loc = (property.location || {}) as { address?: string; city?: string; state?: string; pincode?: string };

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 bg-primary/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link to="/properties" className="text-gray-400 hover:text-white">
            ← Back to Properties
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {String(property.surveyNumber ?? "")}
            </h1>
            <StatusBadge status={String(property.status ?? "")} />
          </div>
          {isOwner && (
            <button
              onClick={() => navigate(`/transfer/${propertyId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-primary font-semibold rounded-lg"
            >
              Initiate Transfer <ArrowRight size={16} />
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 bg-surface rounded-xl border border-gray-800">
              <h3 className="font-semibold text-white mb-4">Property Details</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-gray-500">Location</dt><dd className="text-white">{String(loc?.address || property.location || "")}</dd></div>
                <div><dt className="text-gray-500">City</dt><dd className="text-white">{String(loc?.city || "")}</dd></div>
                <div><dt className="text-gray-500">Area</dt><dd className="text-white">{String(property.area || "")} sq ft</dd></div>
                <div><dt className="text-gray-500">Type</dt><dd className="text-white">{String(property.propertyType || "")}</dd></div>
                <div><dt className="text-gray-500">Owner</dt><dd><BlockchainAddressBadge address={String(property.ownerWallet || "")} /></dd></div>
              </dl>
            </div>

            <div className="p-6 bg-surface rounded-xl border border-gray-800">
              <h3 className="font-semibold text-white mb-4">Document</h3>
              <IPFSDocumentViewer cid={String(property.ipfsCid || "")} />
              <div className="mt-2"><IPFSCIDBadge cid={String(property.ipfsCid || "")} /></div>
            </div>
          </div>

          <div className="space-y-6">
            {onChain && (
              <div className="p-6 bg-surface rounded-xl border border-emerald-500/20">
                <h3 className="font-semibold text-emerald-400 mb-4">On-Chain Verification</h3>
                <dl className="space-y-2 text-sm">
                  <div><dt className="text-gray-500">Verified</dt><dd className="text-white">{String(onChain.isVerified)}</dd></div>
                  <div><dt className="text-gray-500">Owner</dt><dd><BlockchainAddressBadge address={String(onChain.currentOwner || "")} /></dd></div>
                  <div><dt className="text-gray-500">IPFS Hash</dt><dd className="font-mono text-xs text-gray-400">{String(onChain.ipfsDocumentHash).slice(0, 30)}...</dd></div>
                </dl>
              </div>
            )}

            {auditData.length > 0 && (
              <div className="p-6 bg-surface rounded-xl border border-gray-800">
                <h3 className="font-semibold text-white mb-4">Ownership Timeline</h3>
                <AuditTimeline events={auditData as AuditLog[]} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
