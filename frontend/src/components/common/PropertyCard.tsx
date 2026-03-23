import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import type { Property } from "../../types";
import StatusBadge from "./StatusBadge";
import { getIPFSGatewayUrl } from "../../api/axios";

export default function PropertyCard({ property }: { property: Property }) {
  const docUrl = property.ipfsGatewayUrl || getIPFSGatewayUrl(property.ipfsCid);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-indigo-500/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/properties/${property.blockchainPropertyId}`} className="text-white font-semibold hover:underline">
            {property.surveyNumber}
          </Link>
          <div className="text-gray-400 text-sm mt-1">
            {property.location.city}, {property.location.state} • {property.area} sq ft
          </div>
        </div>
        <StatusBadge status={property.status} />
      </div>

      <div className="mt-3 text-sm text-gray-300">
        Type: <span className="font-medium text-gray-200">{property.propertyType}</span>
      </div>

      {docUrl ? (
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-xs text-indigo-400 hover:underline"
        >
          <FileText size={14} />
          View document ↗
        </a>
      ) : null}
    </div>
  );
}

