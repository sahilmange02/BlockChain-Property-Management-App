import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { AuditEntry } from "../types";
import { propertyApi } from "../api/property.api";
import { useAuth } from "../context/AuthContext";
import { getIPFSGatewayUrl } from "../api/axios";
import toast from "react-hot-toast";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const propertyId = Number(id);

  const query = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => {
      if (!Number.isFinite(propertyId)) throw new Error("Invalid property id");
      return propertyApi.getById(propertyId);
    },
    enabled: Number.isFinite(propertyId) && propertyId > 0,
  });

  const property = query.data?.property;
  const onChain = query.data?.onChain;
  const audit = (query.data?.audit || []) as AuditEntry[];

  if (query.isLoading) return <div className="text-gray-400 p-8">Loading...</div>;
  if (query.error || !property) return <div className="text-red-400 p-8">Property not found.</div>;

  const isOwner =
    !!user?.walletAddress && property.ownerWallet.toLowerCase() === user.walletAddress.toLowerCase();

  const docUrl = property.ipfsGatewayUrl || getIPFSGatewayUrl(property.ipfsCid);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{property.surveyNumber}</h1>
          <p className="text-gray-400 mt-2">
            {property.location.city}, {property.location.state} • Area: {property.area} sq ft
          </p>
        </div>
        {isOwner ? (
          <button onClick={() => navigate(`/transfer/${property.blockchainPropertyId}`)} className="btn-primary">
            Transfer Property
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-white">MongoDB Data</h2>
          <div className="text-sm text-gray-300 space-y-2">
            <div>
              <span className="text-gray-400">Blockchain ID: </span>
              <span className="font-mono">{property.blockchainPropertyId}</span>
            </div>
            <div>
              <span className="text-gray-400">Status: </span>
              <span className="font-medium">{property.status}</span>
            </div>
            <div>
              <span className="text-gray-400">Owner: </span>
              <span className="font-mono">{property.ownerWallet}</span>
            </div>
            <div>
              <span className="text-gray-400">Property Type: </span>
              <span className="font-medium">{property.propertyType}</span>
            </div>
            <div>
              <span className="text-gray-400">Description: </span>
              <span>{property.description || "-"}</span>
            </div>
            <div className="pt-2">
              <span className="text-gray-400">Document: </span>
              {docUrl ? (
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline ml-2">
                  View ↗
                </a>
              ) : (
                <span className="text-gray-500 ml-2">N/A</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-white">On-chain Data (best-effort)</h2>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words bg-gray-950/40 border border-gray-800 rounded-lg p-3">
            {JSON.stringify(onChain ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold text-white">Audit Timeline</h2>
          <button
            className="btn-secondary"
            onClick={() => {
              toast.success("Refreshing...");
              query.refetch();
            }}
          >
            Refresh
          </button>
        </div>

        {audit.length === 0 ? (
          <div className="text-gray-500">No audit entries found.</div>
        ) : (
          <div className="space-y-3">
            {audit.map((entry) => (
              <div key={entry._id || `${entry.txHash}-${entry.timestamp}`} className="p-3 rounded-lg border border-gray-800 bg-gray-950/30">
                <div className="text-sm text-white font-semibold">{entry.eventType}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Time: {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "-"} • Tx:{" "}
                  <span className="font-mono text-indigo-400">{entry.txHash}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

