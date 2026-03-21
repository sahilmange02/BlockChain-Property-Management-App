import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getIPFSGatewayUrl } from "@/services/api";
import { StatusBadge } from "./StatusBadge";
import { BlockchainAddressBadge } from "./BlockchainAddressBadge";
import type { Property } from "@/types";

interface Props {
  property: Property;
  isLoading?: boolean;
}

export function PropertyCard({ property, isLoading }: Props) {
  const imageUrl = property.images?.[0]
    ? getIPFSGatewayUrl(property.images[0].cid, property.images[0].filename)
    : property.ipfsGatewayUrl || getIPFSGatewayUrl(property.ipfsCid);
  const location = typeof property.location === "object"
    ? `${property.location.city}, ${property.location.state}`
    : String(property.location);

  if (isLoading) {
    return (
      <div className="bg-surface rounded-xl overflow-hidden border border-gray-800 animate-pulse">
        <div className="h-40 bg-gray-800" />
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-800 rounded w-1/2" />
          <div className="h-3 bg-gray-800 rounded w-3/4" />
          <div className="h-3 bg-gray-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <Link to={`/properties/${property.blockchainPropertyId}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-surface rounded-xl overflow-hidden border border-gray-800 hover:border-emerald-500/30 hover:shadow-glow transition-all cursor-pointer"
      >
        <div className="h-40 bg-gray-900 relative">
          <img
            src={imageUrl}
            alt={property.surveyNumber}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%231B2838' width='100' height='100'/%3E%3Ctext fill='%236B7280' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='12'%3EProperty%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="absolute top-2 right-2">
            <StatusBadge status={property.status} />
          </div>
        </div>
        <div className="p-4">
          <p className="font-mono text-sm text-accent">{property.surveyNumber}</p>
          <p className="text-white font-medium mt-1 truncate">{location}</p>
          <p className="text-gray-500 text-sm mt-1">
            {property.area} sq ft · {property.propertyType}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <BlockchainAddressBadge address={property.ownerWallet} showLink={false} showCopy={false} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
